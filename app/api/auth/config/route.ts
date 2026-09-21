import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns public Supabase configuration without needing NEXT_PUBLIC_ prefixes.
 * Safe for client-side consumption because the anon key is explicitly designed
 * for public client use with Postgres Row Level Security (RLS).
 */
export async function GET() {
  const url = process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_PUBLIC_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const configured = Boolean(url && anonKey && url.startsWith('http'));

  return NextResponse.json({
    configured,
    url: configured ? url : '',
    anonKey: configured ? anonKey : '',
  });
}
