import { NextRequest, NextResponse } from 'next/server';
import { executeMCPTool } from '@/lib/integrations';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      server = 'github',
      tool = 'github_list_repos',
      args = {},
      userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId'),
    } = body;

    if (!userId && isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const result = await executeMCPTool(server, tool, args, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute MCP tool',
      },
      { status: 500 }
    );
  }
}
