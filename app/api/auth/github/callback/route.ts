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

function renderCallbackHtml(success: boolean, message: string, provider = 'github', returnUrl = '/?settings=connectors') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitHub Authorization ${success ? 'Successful' : 'Failed'}</title>
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
    <h2>${success ? '✓ GitHub Connected' : '⚠ Authorization Failed'}</h2>
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
  const errorDescription = searchParams.get('error_description');

  if (error) {
    const errorHtml = renderCallbackHtml(
      false,
      `GitHub authorization was denied: ${errorDescription || error}`,
      'github',
      '/?settings=connectors&error=github_denied'
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
      'github',
      '/?settings=connectors&error=missing_code'
    );
    return new NextResponse(errorHtml, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 1. Verify signed state and extract userId
  const statePayload = verifySignedState(state, 'github');
  if (!statePayload) {
    const errorHtml = renderCallbackHtml(
      false,
      'Invalid or expired OAuth state parameter (CSRF protection triggered). Please try connecting again.',
      'github',
      '/?settings=connectors&error=invalid_state'
    );
    return new NextResponse(errorHtml, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errorHtml = renderCallbackHtml(
      false,
      'Server error: GitHub OAuth client credentials missing from environment.',
      'github',
      '/?settings=connectors&error=missing_server_credentials'
    );
    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  try {
    // 2. Exchange code for access token with GitHub
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[github-callback] Token exchange error:', tokenRes.status, errText);
      const errorHtml = renderCallbackHtml(
        false,
        'Failed to exchange authorization code with GitHub.',
        'github',
        '/?settings=connectors&error=token_exchange_failed'
      );
      return new NextResponse(errorHtml, {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('[github-callback] GitHub error payload:', tokenData);
      const errorHtml = renderCallbackHtml(
        false,
        `GitHub error: ${tokenData.error_description || tokenData.error || 'No access token received'}`,
        'github',
        '/?settings=connectors&error=token_error'
      );
      return new NextResponse(errorHtml, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 3. Inspect GitHub user profile
    let username: string | undefined;
    let email: string | undefined;
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Festa-Studio-Applet',
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        username = userData.login;
        email = userData.email;
      }
    } catch (e) {
      console.warn('[github-callback] Could not fetch GitHub profile:', e);
    }

    // 4. Save per-user connection (encrypted)
    await upsertUserConnection({
      userId: statePayload.userId,
      provider: 'github',
      accessToken: tokenData.access_token,
      scopes: tokenData.scope || 'repo,read:user',
      connectedAt: new Date().toISOString(),
      accountUsername: username,
      accountEmail: email,
    });

    console.log(
      `[github-callback] Successfully bound GitHub account @${username || 'unknown'} to user ${statePayload.userId}`
    );

    const returnUrl = '/?settings=connectors&auth=success&provider=github';
    const successHtml = renderCallbackHtml(
      true,
      `GitHub account ${username ? `@${username}` : ''} successfully connected! You can now use repository tools and open PRs.`,
      'github',
      returnUrl
    );

    return new NextResponse(successHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[github-callback] Exception during callback processing:', err);
    const errorHtml = renderCallbackHtml(
      false,
      `Internal error during authorization: ${err?.message || 'Unknown error'}`,
      'github',
      '/?settings=connectors&error=internal_error'
    );
    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
