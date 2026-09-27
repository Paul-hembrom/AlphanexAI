import { NextRequest, NextResponse } from 'next/server';
import { getMCPManager } from '@/lib/mcp-clients';
import { getUserConnectionsStatus, getValidGitHubToken } from '@/lib/user-connections';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

const BUILTIN_TOOLS = [
  // GitHub
  {
    server: 'github',
    name: 'github_search_code',
    description: 'Search repository files, functions, and commit diffs for relevant syntax.',
  },
  {
    server: 'github',
    name: 'github_list_repos',
    description: 'Enumerate authorized user and organization repositories.',
  },
  {
    server: 'github',
    name: 'github_get_file_contents',
    description: 'Fetch complete file contents and tree structures safely.',
  },
  {
    server: 'github',
    name: 'github_create_pull_request',
    description: 'Stage code patch diffs and trigger pull request review.',
  },
  // Google Docs
  {
    server: 'google-docs',
    name: 'gdocs_read_document',
    description: 'Fetch complete structural text, headings, and tables from Google Docs.',
  },
  {
    server: 'google-docs',
    name: 'gdocs_list_documents',
    description: 'List user documents and briefs matching topic query in Google Drive.',
  },
  {
    server: 'google-docs',
    name: 'gdocs_create_brief',
    description: 'Export structured research dossier or architectural patch directly to a Doc.',
  },
  // Gmail
  {
    server: 'gmail',
    name: 'gmail_list_threads',
    description: 'Query email threads with filter queries (unread, alerts, incident notices).',
  },
  {
    server: 'gmail',
    name: 'gmail_read_thread',
    description: 'Retrieve full email contents, sender addresses, and attachments.',
  },
  {
    server: 'gmail',
    name: 'gmail_draft_response',
    description: 'Prepare and stage draft responses in Gmail.',
  },
];

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      const qUserId = req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id');
      if (qUserId && !qUserId.startsWith('usr_guest') && qUserId !== 'guest-default') {
        userId = qUserId;
      }
    }

    // Resolve real user connection status - never report connected if user has no token
    const connStatus = userId ? await getUserConnectionsStatus(userId) : null;
    const githubConnected = Boolean(connStatus?.github.connected);
    const googleConnected = Boolean(connStatus?.google.connected);

    // Resolve token for MCP manager
    const githubToken = userId && githubConnected ? await getValidGitHubToken(userId) : null;
    const manager = getMCPManager(githubToken);

    await manager.connectAll().catch(() => {});
    const remoteTools = (await manager.listAllTools().catch(() => [])) || [];

    // Combine built-in tool definitions with any remote tools discovered
    const allToolsMap = new Map<string, { server: string; name: string; description: string }>();

    for (const tool of BUILTIN_TOOLS) {
      allToolsMap.set(`${tool.server}__${tool.name}`, tool);
    }

    for (const t of remoteTools) {
      allToolsMap.set(`${t.serverName}__${t.toolName}`, {
        server: t.serverName,
        name: t.toolName,
        description: t.description,
      });
    }

    const toolsList = Array.from(allToolsMap.values());

    return NextResponse.json({
      status: 'operational',
      success: true,
      userId: userId || null,
      connected: githubConnected || googleConnected,
      servers: ['github', 'google-docs', 'gmail', ...manager.serverNames],
      configuredServers: {
        github: githubConnected,
        gmail: googleConnected,
        googleDocs: googleConnected,
      },
      discoveredToolsCount: toolsList.length,
      total_tools_discovered: toolsList.length,
      tools: toolsList,
      integrations: {
        github: {
          status: githubConnected ? 'ready' : 'disconnected',
          tokenPresent: githubConnected,
          username: connStatus?.github.username || null,
          scopes: connStatus?.github.scopes || null,
          source: connStatus?.github.source || 'none',
          capabilities: ['PR Automation', 'Repository Search', 'Code Inspection'],
        },
        googleDocs: {
          status: googleConnected ? 'ready' : 'disconnected',
          tokenPresent: googleConnected,
          source: connStatus?.google.source || 'none',
          capabilities: ['Brief Export', 'Document Reading', 'Drive Search'],
        },
        gmail: {
          status: googleConnected ? 'ready' : 'disconnected',
          tokenPresent: googleConnected,
          source: connStatus?.google.source || 'none',
          capabilities: ['Thread Ingestion', 'Incident Search', 'Draft Composition'],
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'operational',
      success: false,
      connected: false,
      servers: ['github', 'google-docs', 'gmail'],
      discoveredToolsCount: BUILTIN_TOOLS.length,
      total_tools_discovered: BUILTIN_TOOLS.length,
      tools: BUILTIN_TOOLS,
      error: error?.message,
    });
  }
}
