import { NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/workspace';

  if (code && isSupabaseServerConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Return an HTML response that notifies opener if opened in a popup,
        // or redirects to the destination page.
        return new Response(
          `<!DOCTYPE html>
<html>
  <head>
    <title>Authentication Successful — AlphanexAI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #FBF9F5; color: #1F1E1D;">
    <div style="text-align: center; padding: 32px; border: 1px solid #E5E2DC; border-radius: 16px; background: #FFF; box-shadow: 0 4px 20px rgba(0,0,0,0.06); max-width: 360px;">
      <div style="width: 44px; height: 44px; border-radius: 50%; background: #E8F5E9; color: #2E7D32; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 20px; font-weight: bold;">
        ✓
      </div>
      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Signed in successfully</h2>
      <p style="margin: 0; font-size: 13px; color: #736E67; line-height: 1.5;">Completing your AlphanexAI session... This window will close automatically.</p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
        setTimeout(() => window.close(), 600);
      } else {
        window.location.href = ${JSON.stringify(`${origin}${next}`)};
      }
    </script>
  </body>
</html>`,
          {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }
      console.error('[auth/callback] Code exchange error:', error.message);
    } catch (err) {
      console.error('[auth/callback] Unexpected error:', err);
    }
  }

  return NextResponse.redirect(`${origin}/workspace?auth_error=exchange_failed`);
}
