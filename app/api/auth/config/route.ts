import { NextResponse } from 'next/server';

export async function GET() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PUBLIC_URL ||
    process.env.SUPABASE_URL ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLIC_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const configured = Boolean(url && anonKey && url.startsWith('http'));

  return NextResponse.json({
    configured,
    url: configured ? url : undefined,
    anonKey: configured ? anonKey : undefined,
  });
}
