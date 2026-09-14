import { NextResponse } from 'next/server';
import { getMCPManager } from '@/lib/mcp-clients';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const manager = getMCPManager();
    await manager.connectAll();
    const tools = await manager.listAllTools();

    return NextResponse.json({
      status: 'ok',
      connected: manager.isConnected,
      servers: manager.serverNames,
      configuredServers: {
        github: Boolean(process.env.GITHUB_TOKEN),
        gmail: Boolean(process.env.GMAIL_MCP_TOKEN),
        googleDocs: Boolean(process.env.GDOCS_MCP_URL),
      },
      discoveredToolsCount: tools.length,
      tools: tools.map((t) => ({
        server: t.serverName,
        name: t.toolName,
        description: t.description,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message,
      servers: [],
      tools: [],
    });
  }
}
