import { NextRequest, NextResponse } from 'next/server';
import { executeMCPTool } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      server = 'github',
      tool = 'github_list_repos',
      args = {},
      userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId') || 'usr_nepal_builder_001',
    } = body;

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
