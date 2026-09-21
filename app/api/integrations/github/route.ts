import { NextRequest, NextResponse } from 'next/server';
import { executeGitHubAction } from '@/lib/integrations';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      action = 'create_pull_request',
      userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId'),
      ...params
    } = body;

    if (!userId && isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      userId = 'guest-default';
    }

    const result = await executeGitHubAction(action, params, userId);
    return NextResponse.json(result);
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
    let userId = req.headers.get('x-user-id') || searchParams.get('userId');

    if (!userId && isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      userId = 'guest-default';
    }

    const params: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      if (key !== 'action' && key !== 'userId') {
        params[key] = val;
      }
    });

    const result = await executeGitHubAction(action, params, userId);
    return NextResponse.json(result);
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
