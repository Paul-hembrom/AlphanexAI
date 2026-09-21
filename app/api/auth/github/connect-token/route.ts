import { NextRequest, NextResponse } from 'next/server';
import { upsertUserConnection } from '@/lib/user-connections';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, userId: passedUserId } = body;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { success: false, error: 'A valid GitHub Personal Access Token or OAuth token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // Verify token with GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Alphanex-AI-Studio-Applet',
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          error: `GitHub token verification failed (Status: ${userRes.status}). Please verify that your token is valid and not expired.`,
          details: errText,
        },
        { status: 401 }
      );
    }

    const userData = await userRes.json();
    const scopesHeader = userRes.headers.get('x-oauth-scopes') || 'repo,read:user';

    let userId = passedUserId;
    if (!userId && isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      userId = `usr_gh_${userData.login}`;
    }

    // Save connection
    await upsertUserConnection({
      userId,
      provider: 'github',
      accessToken: cleanToken,
      accountUsername: userData.login,
      accountEmail: userData.email || `${userData.login}@users.noreply.github.com`,
      scopes: scopesHeader,
    });

    return NextResponse.json({
      success: true,
      userId,
      username: userData.login,
      avatarUrl: userData.avatar_url,
      scopes: scopesHeader,
      message: `Successfully connected to GitHub as @${userData.login}!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to connect GitHub token.' },
      { status: 500 }
    );
  }
}
