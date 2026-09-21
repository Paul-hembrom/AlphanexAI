'use client';

import React, { useState, useEffect } from 'react';
import {
  Github,
  AlertCircle,
  Loader2,
  Key,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { createClient, isSupabaseConfigured, setRuntimeSupabaseConfig } from '@/lib/supabase/client';

export type AuthMode = 'signin' | 'signup' | 'forgot_password';

interface SignInCardProps {
  onSuccess?: () => void;
  initialMode?: AuthMode;
  compact?: boolean;
}

export default function SignInCard({
  onSuccess,
  initialMode = 'signin',
  compact = false,
}: SignInCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / Recovery specific state
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryAction, setRecoveryAction] = useState<'login_only' | 'change_password'>('login_only');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Attempt to load runtime Supabase config if not yet available
  const ensureSupabaseClient = async () => {
    if (isSupabaseConfigured()) {
      return createClient();
    }
    try {
      const res = await fetch('/api/auth/config');
      const cfg = await res.json();
      if (cfg?.configured && cfg.url && cfg.anonKey) {
        setRuntimeSupabaseConfig(cfg.url, cfg.anonKey);
        return createClient();
      }
    } catch {
      // ignore
    }
    return null;
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const client = await ensureSupabaseClient();
    if (!client) {
      setShowConfigNotice(true);
      return;
    }

    setLoadingProvider(provider);

    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback`;
      const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: isInsideIframe,
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
        },
      });

      if (error) throw error;

      if (isInsideIframe && data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.url,
          'alphanex_auth_popup',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        if (!popup) {
          window.open(data.url, '_blank');
        }
      }
    } catch (err: any) {
      console.error(`[auth] Sign-in with ${provider} failed:`, err);
      setErrorMessage(err?.message || `Failed to sign in with ${provider}. Please try again.`);
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    const client = await ensureSupabaseClient();
    if (!client) {
      setShowConfigNotice(true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage('Account created and logged in successfully! Redirecting...');
          setTimeout(() => {
            onSuccess?.();
          }, 800);
        } else if (data.user) {
          setSuccessMessage(
            'Account created! Please check your email inbox to confirm your registration.'
          );
        }
      } else {
        // Log in mode
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage('Welcome back! Logging in...');
          setTimeout(() => {
            onSuccess?.();
          }, 600);
        }
      }
    } catch (err: any) {
      console.error(`[auth] Email ${mode} failed:`, err);
      setErrorMessage(
        err?.message || `Authentication failed. Please verify your credentials and try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Forgot Password Step 1: Send verification code to existing Gmail
  const handleRequestVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered Gmail or email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setRecoveryStep('verify');
      setResendCooldown(60);
      setSuccessMessage(
        data.message || `Verification code sent to ${email}. Check your email inbox or spam folder.`
      );

      if (data.demoCode) {
        setDemoCodeHint(data.demoCode);
      }
    } catch (err: any) {
      console.error('[auth] Failed to request verification code:', err);
      setErrorMessage(err?.message || 'Could not send verification code. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Forgot Password Step 2: Verify Code and either log in or change password
  const handleVerifyCodeAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      setErrorMessage('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (recoveryAction === 'change_password') {
      if (!newPassword || newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Call server verification endpoint
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
          newPassword: recoveryAction === 'change_password' ? newPassword : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Verification failed. Code may be invalid or expired.');
      }

      // 2. Also attempt client-side Supabase verifyOtp if client is configured
      const client = await ensureSupabaseClient();
      if (client) {
        try {
          const { error: otpError } = await client.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: cleanCode,
            type: 'recovery',
          });
          if (!otpError && recoveryAction === 'change_password' && newPassword) {
            await client.auth.updateUser({ password: newPassword });
          }
        } catch {
          // Server endpoint already handled the authorization
        }
      }

      setSuccessMessage(
        recoveryAction === 'change_password'
          ? 'Password updated successfully! Redirecting to workspace...'
          : 'Code verified! Logging you in...'
      );

      setTimeout(() => {
        onSuccess?.();
      }, 900);
    } catch (err: any) {
      console.error('[auth] Verification error:', err);
      setErrorMessage(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="alphanex-signin-card"
      className={`rounded-2xl border border-[#E5E2DC] bg-white shadow-xl text-[#1F1E1D] transition-all ${
        compact ? 'p-5' : 'p-6 sm:p-8 max-w-md w-full mx-auto'
      }`}
    >
      {/* Brand & Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#1F1E1D] text-amber-400 font-bold text-lg mb-2 shadow-xs">
          {mode === 'forgot_password' ? <Key className="w-5 h-5 text-amber-400" /> : 'AN'}
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1F1E1D] tracking-tight">
          {mode === 'signup'
            ? 'Create your Alphanex AI account'
            : mode === 'forgot_password'
            ? 'Reset Password & Quick Login'
            : 'Log in to Alphanex AI Studio'}
        </h2>
        <p className="text-xs sm:text-sm text-[#736E67] mt-1 leading-relaxed">
          {mode === 'signup'
            ? 'Sign up through Google Auth or Email to access persistent workspaces & frontier models.'
            : mode === 'forgot_password'
            ? 'Enter your registered Gmail or email to receive a verification code.'
            : 'Access your persistent workspaces, reasoning canvas, and saved threads.'}
        </p>
      </div>

      {/* Mode Selector (Only shown in signin / signup) */}
      {mode !== 'forgot_password' && (
        <div className="flex rounded-xl bg-[#F4F1EA] p-1 mb-5 border border-[#E5E2DC]">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-[#1F1E1D] shadow-xs'
                : 'text-[#736E67] hover:text-[#1F1E1D]'
            }`}
          >
            Log in
          </button>
          <button
            id="auth-tab-signup"
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-[#1F1E1D] shadow-xs'
                : 'text-[#736E67] hover:text-[#1F1E1D]'
            }`}
          >
            Sign up
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              {mode === 'signup'
                ? 'Sign up failed'
                : mode === 'forgot_password'
                ? 'Recovery failed'
                : 'Log in failed'}
            </p>
            <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Demo Code Helper (if provided in sandbox environment) */}
      {mode === 'forgot_password' && recoveryStep === 'verify' && demoCodeHint && (
        <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold">Verification Code: </span>
              <span className="font-mono font-bold tracking-widest text-blue-800 text-sm">
                {demoCodeHint}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerificationCode(demoCodeHint)}
            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[10px] cursor-pointer"
          >
            Auto-fill
          </button>
        </div>
      )}

      {/* Missing Config Notification */}
      {showConfigNotice && (
        <div className="mb-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Key className="w-4 h-4 text-amber-700" />
            <span>Supabase Configuration Required</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            To enable production authentication, configure the environment variables or continue in Guest Demo Mode:
          </p>
          <button
            type="button"
            onClick={() => {
              onSuccess?.();
            }}
            className="w-full mt-2 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Continue in Guest Demo Mode &rarr;
          </button>
        </div>
      )}

      {/* VIEW 1 & 2: SIGN IN / SIGN UP */}
      {mode !== 'forgot_password' ? (
        <>
          {/* Primary Action: Google Authentication */}
          <div className="space-y-2.5">
            <button
              id="auth-google-cta-btn"
              type="button"
              disabled={loadingProvider !== null || isSubmitting}
              onClick={() => handleOAuthSignIn('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#D5D0C7] bg-white hover:bg-[#FAF8F5] text-xs sm:text-sm font-semibold text-[#1F1E1D] transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#736E67]" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>
                {loadingProvider === 'google'
                  ? 'Connecting to Google...'
                  : mode === 'signup'
                  ? 'Sign up with Google'
                  : 'Log in with Google'}
              </span>
            </button>

            {/* Continue with GitHub */}
            <button
              id="auth-github-cta-btn"
              type="button"
              disabled={loadingProvider !== null || isSubmitting}
              onClick={() => handleOAuthSignIn('github')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loadingProvider === 'github' ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
              ) : (
                <Github className="w-4 h-4 shrink-0 text-white" />
              )}
              <span>
                {loadingProvider === 'github'
                  ? 'Connecting to GitHub...'
                  : mode === 'signup'
                  ? 'Sign up with GitHub'
                  : 'Log in with GitHub'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E2DC]" />
            </div>
            <span className="relative bg-white px-3 text-[11px] text-[#8C877F] uppercase tracking-wider">
              or with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#4A463F] mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                  <input
                    id="auth-signup-name-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Devendra Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D] placeholder:text-[#A8A39A]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#4A463F] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D] placeholder:text-[#A8A39A]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#4A463F]">Password</label>
                {mode === 'signin' && (
                  <button
                    id="auth-forgot-password-link"
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setRecoveryStep('request');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D] placeholder:text-[#A8A39A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C877F] hover:text-[#1F1E1D] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isSubmitting || loadingProvider !== null}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account & Log in' : 'Log in'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
            </button>
          </form>

          {/* Switcher at bottom */}
          <div className="mt-5 pt-4 border-t border-[#EAE6DF] text-center text-xs text-[#736E67]">
            {mode === 'signin' ? (
              <div>
                Don&apos;t have an account?{' '}
                <button
                  id="auth-switch-to-signup-btn"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-[#1F1E1D] hover:underline cursor-pointer"
                >
                  Sign up through Google Auth &rarr;
                </button>
              </div>
            ) : (
              <div>
                Already have an account?{' '}
                <button
                  id="auth-switch-to-signin-btn"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-[#1F1E1D] hover:underline cursor-pointer"
                >
                  Log in &rarr;
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VIEW 3: FORGOT PASSWORD FLOW */
        <div id="forgot-password-flow" className="space-y-4 animate-in fade-in duration-200">
          {recoveryStep === 'request' ? (
            /* STEP 1: REQUEST VERIFICATION CODE */
            <form onSubmit={handleRequestVerificationCode} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A463F] mb-1">
                  Registered Gmail or Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                  <input
                    id="recovery-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D] placeholder:text-[#A8A39A]"
                  />
                </div>
                <p className="text-[11px] text-[#736E67] mt-1.5 leading-relaxed">
                  We will send a 6-digit verification code to this address. You can use it to log in immediately or set a new password.
                </p>
              </div>

              <button
                id="recovery-send-code-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: ENTER CODE & CHOOSE (LOG IN OR CHANGE PASSWORD) */
            <form onSubmit={handleVerifyCodeAndProceed} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] text-xs">
                <div className="flex items-center justify-between text-[#736E67]">
                  <span>Code sent to:</span>
                  <button
                    type="button"
                    onClick={() => setRecoveryStep('request')}
                    className="text-amber-700 font-semibold hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
                <div className="font-semibold text-[#1F1E1D] mt-0.5 break-all">{email}</div>
              </div>

              {/* 6-Digit Code Input */}
              <div>
                <label className="block text-xs font-semibold text-[#4A463F] mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                  <input
                    id="recovery-code-input"
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2 text-base font-mono tracking-widest text-center rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D]"
                  />
                </div>
              </div>

              {/* Recovery Action Choice: Direct Log in vs Set New Password */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-[#4A463F] mb-1.5">
                  Action after verification:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryAction('login_only')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      recoveryAction === 'login_only'
                        ? 'border-[#1F1E1D] bg-[#FAF8F5] font-semibold text-[#1F1E1D] ring-1 ring-[#1F1E1D]'
                        : 'border-[#E5E2DC] text-[#736E67] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="block font-medium">Log in directly</span>
                    <span className="text-[10px] text-[#8C877F]">Fast one-time access</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecoveryAction('change_password')}
                    className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      recoveryAction === 'change_password'
                        ? 'border-[#1F1E1D] bg-[#FAF8F5] font-semibold text-[#1F1E1D] ring-1 ring-[#1F1E1D]'
                        : 'border-[#E5E2DC] text-[#736E67] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="block font-medium">Set new password</span>
                    <span className="text-[10px] text-[#8C877F]">Change password & log in</span>
                  </button>
                </div>
              </div>

              {/* Password Fields (If Change Password was selected) */}
              {recoveryAction === 'change_password' && (
                <div className="space-y-2.5 pt-1 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-[#4A463F] mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                      <input
                        id="recovery-new-password-input"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C877F] hover:text-[#1F1E1D] cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A463F] mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
                      <input
                        id="recovery-confirm-password-input"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                id="recovery-verify-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                ) : (
                  <>
                    <span>
                      {recoveryAction === 'change_password'
                        ? 'Verify Code & Update Password'
                        : 'Verify Code & Log in'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </>
                )}
              </button>

              {/* Resend Code Button */}
              <div className="pt-2 text-center text-xs text-[#736E67] flex items-center justify-center gap-2">
                <span>Didn&apos;t receive the code?</span>
                <button
                  id="recovery-resend-btn"
                  type="button"
                  disabled={isSubmitting || resendCooldown > 0}
                  onClick={handleRequestVerificationCode}
                  className="font-semibold text-[#1F1E1D] hover:underline disabled:text-[#A8A39A] cursor-pointer inline-flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? '' : 'animate-pulse'}`} />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Return to Login */}
          <div className="pt-3 border-t border-[#EAE6DF] text-center">
            <button
              id="recovery-back-to-signin-btn"
              type="button"
              onClick={() => {
                setMode('signin');
                setRecoveryStep('request');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A463F] hover:text-[#1F1E1D] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Log in</span>
            </button>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="mt-4 pt-3 flex items-center justify-center gap-2 text-[11px] text-[#8C877F]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Secured with Supabase Auth & Row Level Security</span>
      </div>
    </div>
  );
}
