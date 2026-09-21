import { NextRequest, NextResponse } from 'next/server';
import { verifySignedState } from '@/lib/oauth-state';
import { upsertUserConnection } from '@/lib/user-connections';

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

function renderCallbackHtml(success: boolean, message: string, provider = 'google', returnUrl = '/?settings=connectors') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Google Workspace Authorization ${success ? 'Successful' : 'Failed'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #FAF8F5;
      color: #1F1E1D;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E5E2DC;
      border-radius: 16px;
      padding: 32px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    h2 { margin-top: 0; font-size: 18px; color: ${success ? '#15803d' : '#b91c1c'}; }
    p { font-size: 14px; color: #55504A; line-height: 1.5; }
    .btn {
      display: inline-block;
      margin-top: 16px;
      padding: 8px 16px;
      background: #2563eb;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>${success ? '✓ Google Workspace Connected' : '⚠ Authorization Failed'}</h2>
    <p>${message}</p>
    <a href="${returnUrl}" class="btn" id="returnBtn">Return to App</a>
  </div>
  <script>
    (function() {
      var payload = {
        type: '${success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_FAILURE'}',
        provider: '${provider}',
        message: ${JSON.stringify(message)}
      };
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(payload, '*');
          setTimeout(function() { window.close(); }, 800);
        } catch (e) {
          console.warn('PostMessage error:', e);
        }
      } else {
        setTimeout(function() {
          window.location.href = '${returnUrl}';
        }, 1200);
      }
    })();
  </script>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const errorHtml = renderCallbackHtml(
      false,
      `Google authorization was denied: ${error}`,
      'google',
      '/?settings=connectors&error=google_denied'
    );
    return new NextResponse(errorHtml, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!code || !state) {
    const errorHtml = renderCallbackHtml(
      false,
      'Missing authorization code or state parameter.',
      'google',
      '/?settings=connectors&error=missing_code'
    );
    return new NextResponse(errorHtml, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 1. Verify signed state and extract userId
  const statePayload = verifySignedState(state, 'google');
  if (!statePayload) {
    const errorHtml = renderCallbackHtml(
      false,
      'Invalid or expired OAuth state parameter (CSRF protection). Please try connecting again.',
      'google',
      '/?settings=connectors&error=invalid_state'
    );
    return new NextResponse(errorHtml, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errorHtml = renderCallbackHtml(
      false,
      'Server error: Google OAuth client credentials missing from environment.',
      'google',
      '/?settings=connectors&error=missing_server_credentials'
    );
    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 2. Exchange code for access token & refresh token with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[google-callback] Token exchange error:', tokenRes.status, errText);
      const errorHtml = renderCallbackHtml(
        false,
        'Failed to exchange authorization code with Google.',
        'google',
        '/?settings=connectors&error=token_exchange_failed'
      );
      return new NextResponse(errorHtml, {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[google-callback] No access_token in Google response:', tokenData);
      const errorHtml = renderCallbackHtml(
        false,
        'No access token received from Google.',
        'google',
        '/?settings=connectors&error=token_error'
      );
      return new NextResponse(errorHtml, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 3. Inspect user profile
    let email: string | undefined;
    try {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (infoRes.ok) {
        const info = await infoRes.json();
        email = info.email;
      }
    } catch (e) {
      console.warn('[google-callback] Could not fetch Google user info:', e);
    }

    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // 4. Save per-user connection (with refresh_token for automatic background renewal)
    await upsertUserConnection({
      userId: statePayload.userId,
      provider: 'google',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      scopes: tokenData.scope || 'gmail,docs',
      expiresAt,
      connectedAt: new Date().toISOString(),
      accountEmail: email,
    });

    console.log(
      `[google-callback] Successfully bound Google Workspace account ${email || 'unknown'} to user ${statePayload.userId}. Refresh token received: ${!!tokenData.refresh_token}`
    );

    const returnUrl = '/?settings=connectors&auth=success&provider=google';
    const successHtml = renderCallbackHtml(
      true,
      `Google Workspace account ${email ? `(${email})` : ''} successfully connected! Both Gmail and Google Docs workspaces are now active.`,
      'google',
      returnUrl
    );

    return new NextResponse(successHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[google-callback] Exception during callback processing:', err);
    const errorHtml = renderCallbackHtml(
      false,
      `Internal error during authorization: ${err?.message || 'Unknown error'}`,
      'google',
      '/?settings=connectors&error=internal_error'
    );
    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
