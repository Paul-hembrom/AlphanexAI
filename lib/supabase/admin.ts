import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Checks if the privileged Supabase service role key is configured.
 */
export function isAdminConfigured(): boolean {
  const url = process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && key && url.startsWith('http') && key.length > 10);
}

/**
 * Privileged server-only Supabase admin client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security for administrative
 * operations like writing token_usage_log and reading/writing encrypted user_connections.
 *
 * CRITICAL SECURITY INVARIANT:
 * NEVER import this file into any 'use client' component or client bundle.
 * SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the browser.
 */
export function createAdminClient(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url = process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || !url.startsWith('http')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL environment variable is missing. ' +
      'Ensure SUPABASE_SERVICE_ROLE_KEY is configured in server-only environment variables.'
    );
  }

  cachedAdminClient = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
