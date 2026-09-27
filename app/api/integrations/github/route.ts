import { NextRequest, NextResponse } from 'next/server';
import { executeGitHubAction } from '@/lib/integrations';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

async function resolveAuthenticatedUserId(
  req: NextRequest,
  fallbackUserId?: string | null
): Promise<string | null> {
  // 1. Resolve from Supabase session cookie first
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        return user.id;
      }
    } catch {}
  }

  // 2. Resolve from fallback passed explicitly if not a guest ID
  if (
    fallbackUserId &&
    typeof fallbackUserId === 'string' &&
    !fallbackUserId.startsWith('usr_guest') &&
    fallbackUserId !== 'guest-default'
  ) {
    return fallbackUserId;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action = 'create_pull_request',
      userId: bodyUserId,
      ...params
    } = body;

    const headerUserId = req.headers.get('x-user-id');
    const queryUserId = req.nextUrl.searchParams.get('userId');
    const passedId = bodyUserId || headerUserId || queryUserId;

    const userId = await resolveAuthenticatedUserId(req, passedId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          needsAuth: true,
          error: 'Authentication required. Please sign in to use GitHub integration.',
        },
        { status: 401 }
      );
    }

    const result = await executeGitHubAction(action, params, userId);
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
        error: error?.message || 'Failed to execute GitHub action',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = (searchParams.get('action') || 'list_repos') as any;
    const headerUserId = req.headers.get('x-user-id');
    const queryUserId = searchParams.get('userId');
    const passedId = headerUserId || queryUserId;

    const userId = await resolveAuthenticatedUserId(req, passedId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          needsAuth: true,
          error: 'Authentication required. Please sign in to use GitHub integration.',
        },
        { status: 401 }
      );
    }

    const params: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      if (key !== 'action' && key !== 'userId') {
        params[key] = val;
      }
    });

    const result = await executeGitHubAction(action, params, userId);
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
        error: error?.message || 'Failed to execute GitHub action',
      },
      { status: 500 }
    );
  }
}
