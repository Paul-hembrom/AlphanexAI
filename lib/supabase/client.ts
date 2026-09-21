import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __SUPABASE_PUBLIC_URL__?: string;
    __SUPABASE_PUBLIC_ANON_KEY__?: string;
  }
}

let runtimeConfig: { url: string; anonKey: string } | null = null;
let browserClientInstance: SupabaseClient | null = null;

export function setRuntimeSupabaseConfig(url: string, anonKey: string) {
  if (url && anonKey && url.startsWith('http')) {
    runtimeConfig = { url, anonKey };
    if (typeof window !== 'undefined') {
      window.__SUPABASE_PUBLIC_URL__ = url;
      window.__SUPABASE_PUBLIC_ANON_KEY__ = anonKey;
    }
    browserClientInstance = null;
  }
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  if (runtimeConfig) return runtimeConfig;

  if (typeof window !== 'undefined') {
    const url = window.__SUPABASE_PUBLIC_URL__;
    const anonKey = window.__SUPABASE_PUBLIC_ANON_KEY__;
    if (url && anonKey && url.startsWith('http')) {
      runtimeConfig = { url, anonKey };
      return runtimeConfig;
    }
  }

  const url = process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLIC_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && anonKey && url.startsWith('http')) {
    runtimeConfig = { url, anonKey };
    return runtimeConfig;
  }

  return null;
}

/**
 * Checks if Supabase client-side environment variables are available.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

/**
 * Browser-side Supabase client for Next.js App Router Client Components.
 * Uses SUPABASE_PUBLIC_URL and SUPABASE_PUBLIC_ANON_KEY (no NEXT_ prefix required).
 * Handles cookie-based sessions, auth state synchronization, and RLS queries.
 */
export function createClient(): SupabaseClient {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(
      'Supabase environment variables (SUPABASE_PUBLIC_URL and SUPABASE_PUBLIC_ANON_KEY) are missing or invalid.'
    );
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(config.url, config.anonKey);
  }

  return browserClientInstance;
}

