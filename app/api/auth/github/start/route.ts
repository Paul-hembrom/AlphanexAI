import { NextRequest, NextResponse } from 'next/server';
import { generateSignedState } from '@/lib/oauth-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl(req: NextRequest): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' && !process.env.APP_URL.includes('localhost')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) {
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'usr_nepal_builder_001';
  const format = searchParams.get('format');

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    const errorMsg = 'GITHUB_OAUTH_CLIENT_ID is not configured in server environment.';
    if (format === 'json') {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }
    return NextResponse.redirect(
      new URL('/?settings=connectors&error=missing_github_credentials', req.nextUrl.origin)
    );
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/github/callback`;
  const state = generateSignedState(userId, 'github');
  const scope = 'repo read:user user:email';

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      url: authUrl.toString(),
      redirectUri,
    });
  }

  return NextResponse.redirect(authUrl.toString());
}
