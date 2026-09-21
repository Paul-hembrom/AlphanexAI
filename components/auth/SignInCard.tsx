'use client';

import React, { useState } from 'react';
import {
  Github,
  AlertCircle,
  Sparkles,
  Loader2,
  Key,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { createClient, isSupabaseConfigured, setRuntimeSupabaseConfig } from '@/lib/supabase/client';

interface SignInCardProps {
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
  compact?: boolean;
}

export default function SignInCard({
  onSuccess,
  initialMode = 'signin',
  compact = false,
}: SignInCardProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

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

    setIsSubmittingEmail(true);

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
      setIsSubmittingEmail(false);
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
          AN
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1F1E1D] tracking-tight">
          {mode === 'signup' ? 'Create your Alphanex AI account' : 'Log in to Alphanex AI Studio'}
        </h2>
        <p className="text-xs sm:text-sm text-[#736E67] mt-1 leading-relaxed">
          {mode === 'signup'
            ? 'Sign up through Google Auth or Email to access persistent workspaces & frontier models.'
            : 'Access your persistent workspaces, reasoning canvas, and saved threads.'}
        </p>
      </div>

      {/* Segmented Mode Selector: Log in vs Sign up */}
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
              {mode === 'signup' ? 'Sign up failed' : 'Log in failed'}
            </p>
            <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Missing Config Notification with Demo bypass */}
      {showConfigNotice && (
        <div className="mb-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Key className="w-4 h-4 text-amber-700" />
            <span>Supabase Configuration Required</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            To enable production authentication, configure the following variables in your deployment environment or Settings:
          </p>
          <div className="p-2 rounded bg-white/80 border border-amber-200 font-mono text-[10px] space-y-1">
            <div>SUPABASE_PUBLIC_URL</div>
            <div>SUPABASE_PUBLIC_ANON_KEY</div>
            <div className="text-[#8C877F]"># Server-only key</div>
            <div>SUPABASE_SERVICE_ROLE_KEY</div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSuccess?.();
            }}
            className="w-full mt-2 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors"
          >
            Continue in Guest Demo Mode &rarr;
          </button>
        </div>
      )}

      {/* Primary Action: Google Authentication (Front & Center) */}
      <div className="space-y-2.5">
        <button
          id="auth-google-cta-btn"
          type="button"
          disabled={loadingProvider !== null || isSubmittingEmail}
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
          disabled={loadingProvider !== null || isSubmittingEmail}
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
              placeholder="you@example.com"
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D] placeholder:text-[#A8A39A]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#4A463F] mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C877F]" />
            <input
              id="auth-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#D5D0C7] focus:border-[#1F1E1D] focus:ring-1 focus:ring-[#1F1E1D] outline-hidden text-[#1F1E1D] placeholder:text-[#A8A39A]"
            />
          </div>
        </div>

        <button
          id="auth-submit-btn"
          type="submit"
          disabled={isSubmittingEmail || loadingProvider !== null}
          className="w-full mt-2 py-2.5 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmittingEmail ? (
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

      {/* Security Note */}
      <div className="mt-4 pt-3 flex items-center justify-center gap-2 text-[11px] text-[#8C877F]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Secured with Supabase Auth & Row Level Security</span>
      </div>
    </div>
  );
}
