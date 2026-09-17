import { NextRequest, NextResponse } from 'next/server';
import { executeMCPTool } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { server = 'github', tool = 'github_list_repos', args = {} } = body;

    const result = await executeMCPTool(server, tool, args);
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
