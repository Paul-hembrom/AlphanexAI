import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __SUPABASE_PUBLIC_URL__?: string;
    __SUPABASE_PUBLIC_ANON_KEY__?: string;
  }
}

export function setRuntimeSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    window.__SUPABASE_PUBLIC_URL__ = url;
    window.__SUPABASE_PUBLIC_ANON_KEY__ = anonKey;
  }
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url =
    (typeof window !== 'undefined' && window.__SUPABASE_PUBLIC_URL__) ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PUBLIC_URL ||
    '';
  const anonKey =
    (typeof window !== 'undefined' && window.__SUPABASE_PUBLIC_ANON_KEY__) ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLIC_ANON_KEY ||
    '';

  if (url && anonKey && url.startsWith('http')) {
    return { url, anonKey };
  }
  return null;
}

/**
 * Checks if Supabase client-side environment variables or runtime credentials are available.
 */
export function isSupabaseConfigured(): boolean {
  return !!getSupabaseConfig();
}

/**
 * Browser-side Supabase client for Next.js App Router Client Components.
 */
export function createClient() {
  const cfg = getSupabaseConfig();

  if (!cfg) {
    throw new Error(
      'Supabase configuration (SUPABASE_PUBLIC_URL and SUPABASE_PUBLIC_ANON_KEY) is missing or invalid.'
    );
  }

  return createBrowserClient(cfg.url, cfg.anonKey);
}

