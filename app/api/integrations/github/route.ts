import { NextRequest, NextResponse } from 'next/server';
import { executeGitHubAction } from '@/lib/integrations';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId && !bodyUserId.startsWith('usr_guest') && bodyUserId !== 'guest-default') {
    return bodyUserId;
  }
  const headerId = req.headers.get('x-user-id');
  if (headerId) return headerId;
  const queryId = req.nextUrl.searchParams.get('userId');
  if (queryId && !queryId.startsWith('usr_guest') && queryId !== 'guest-default') return queryId;
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user.id;
    } catch {}
  }
  return bodyUserId || queryId || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'list_repos', userId: passedUserId, ...params } = body;
    const userId = await resolveUserId(req, passedUserId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          needsAuth: true,
          error: 'Sign in first, then connect GitHub with repo scope.',
        },
        { status: 401 }
      );
    }

    const result = await executeGitHubAction(action, params, userId);
    return NextResponse.json(result, { status: result.success ? 200 : result.needsAuth ? 401 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute GitHub action' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = (searchParams.get('action') || 'list_repos') as any;
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, needsAuth: true, error: 'Sign in first, then connect GitHub with repo scope.' },
        { status: 401 }
      );
    }

    const params: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      if (key !== 'action' && key !== 'userId') params[key] = val;
    });

    const result = await executeGitHubAction(action, params, userId);
    return NextResponse.json(result, { status: result.success ? 200 : result.needsAuth ? 401 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute GitHub action' },
      { status: 500 }
    );
  }
}
