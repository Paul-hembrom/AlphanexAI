'use client';

import React, { useState } from 'react';
import { Github, AlertCircle, Sparkles, Loader2, Key, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createClient, isSupabaseConfigured, setRuntimeSupabaseConfig } from '@/lib/supabase/client';

interface SignInCardProps {
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function SignInCard({
  onSuccess,
  title = 'Sign in to AlphanexAI',
  subtitle = 'Access your persistent workspaces, frontier models, and reasoning canvas.',
  compact = false,
}: SignInCardProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      try {
        const res = await fetch('/api/auth/config');
        const cfg = await res.json();
        if (cfg?.configured && cfg.url && cfg.anonKey) {
          setRuntimeSupabaseConfig(cfg.url, cfg.anonKey);
        } else {
          setShowConfigNotice(true);
          return;
        }
      } catch {
        setShowConfigNotice(true);
        return;
      }
    }

    setLoadingProvider(provider);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback`;

      // Determine if running inside an iframe (AI Studio preview)
      const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

      // In an iframe, directly redirecting can trigger X-Frame-Options errors from accounts.google.com.
      // skipBrowserRedirect gives us the provider OAuth URL to open in a popup or new tab.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: isInsideIframe,
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (isInsideIframe && data?.url) {
        // Open in popup window
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
          // If popup is blocked by browser, open in new tab
          window.open(data.url, '_blank');
        }
      }
    } catch (err: any) {
      console.error(`[auth] Sign-in with ${provider} failed:`, err);
      setErrorMessage(err?.message || `Failed to sign in with ${provider}. Please try again.`);
      setLoadingProvider(null);
    }
  };

  return (
    <div
      id="alphanex-signin-card"
      className={`rounded-2xl border border-[#E5E2DC] bg-white shadow-lg text-[#1F1E1D] ${
        compact ? 'p-5' : 'p-6 sm:p-8 max-w-md w-full mx-auto'
      }`}
    >
      {/* Brand & Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#1F1E1D] text-amber-400 font-bold text-lg mb-3 shadow-xs">
          AN
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1F1E1D] tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[#736E67] mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Sign in could not be completed</p>
            <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Missing Config Notification */}
      {showConfigNotice && (
        <div className="mb-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-2 animate-in fade-in">
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
          <p className="text-[10px] text-amber-700">
            Enable Google and GitHub providers in your Supabase project under <strong>Authentication &rarr; Providers</strong>.
          </p>
        </div>
      )}

      {/* OAuth Action Buttons */}
      <div className="space-y-3">
        {/* Continue with Google */}
        <button
          id="auth-continue-google-btn"
          type="button"
          disabled={loadingProvider !== null}
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
          <span>{loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Continue with GitHub */}
        <button
          id="auth-continue-github-btn"
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => handleOAuthSignIn('github')}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {loadingProvider === 'github' ? (
            <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
          ) : (
            <Github className="w-4 h-4 shrink-0 text-white" />
          )}
          <span>{loadingProvider === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
        </button>
      </div>

      {/* Security & Features Note */}
      <div className="mt-6 pt-4 border-t border-[#EAE6DF] space-y-2 text-[11px] text-[#736E67]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Real sessions secured with Row Level Security</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Automated profile creation via on_auth_user_created trigger</span>
        </div>
      </div>
    </div>
  );
}
