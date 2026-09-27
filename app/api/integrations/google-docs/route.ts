import { NextRequest, NextResponse } from 'next/server';
import { executeGoogleDocsAction } from '@/lib/integrations';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      action = 'create_brief',
      userId: bodyUserId,
      ...params
    } = body;

    let userId: string | null = null;
    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      const fallback = bodyUserId || req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
      if (fallback && !fallback.startsWith('usr_guest') && fallback !== 'guest-default') {
        userId = fallback;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, needsAuth: true, error: 'Authentication required. Please sign in to access Google Docs.' },
        { status: 401 }
      );
    }

    const result = await executeGoogleDocsAction(action, params, userId);
    const status = result.success
      ? 200
      : result.needsAuth
      ? 401
      : result.status && result.status >= 400 && result.status < 600
      ? result.status
      : 400;

    return NextResponse.json(result, { status });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute Google Docs action',
      },
      { status: 500 }
    );
  }
}
