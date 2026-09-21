import { createBrowserClient } from '@supabase/ssr';

/**
 * Checks if Supabase client-side environment variables are available.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );
}

/**
 * Browser-side Supabase client for Next.js App Router Client Components.
 * Uses ONLY public environment variables:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Handles cookie-based sessions, auth state synchronization, and RLS queries.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !url.startsWith('http')) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or invalid.'
    );
  }

  return createBrowserClient(url, anonKey);
}
