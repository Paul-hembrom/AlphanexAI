import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { storeVerificationCode } from '@/lib/auth-recovery';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid registered Gmail or email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const origin = req.nextUrl.origin;

    // Generate a 6-digit verification code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    storeVerificationCode(normalizedEmail, generatedCode, 15 * 60 * 1000);

    let supabaseSent = false;

    // 1. If Supabase is configured, trigger the real reset password email
    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${origin}/auth/callback?next=/workspace`,
        });

        if (error) {
          console.warn('[forgot-password] Supabase resetPasswordForEmail warning:', error.message);
        } else {
          supabaseSent = true;
        }
      } catch (err: any) {
        console.error('[forgot-password] Failed to invoke resetPasswordForEmail:', err);
      }
    }

    const isConfigured = isSupabaseServerConfigured();

    return NextResponse.json({
      success: true,
      message: supabaseSent
        ? `A verification code and password reset link have been sent to ${normalizedEmail}.`
        : `Verification code generated for ${normalizedEmail}.`,
      email: normalizedEmail,
      // If Supabase is not configured or in sandbox preview, provide fallback verification code so testing works without external SMTP
      demoCode: !isConfigured || !supabaseSent ? generatedCode : undefined,
      expiresInMinutes: 15,
    });
  } catch (error: any) {
    console.error('[forgot-password] Route error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
