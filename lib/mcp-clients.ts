// =============================================================================
// lib/mcp-clients.ts
//
// Manages connections to remote MCP servers (GitHub, Gmail, Google Docs)
// using the official @modelcontextprotocol/sdk Streamable HTTP transport.
// =============================================================================

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPServerConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
  description?: string;
}

export interface DiscoveredTool {
  serverName: string;
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export function defaultMCPServers(githubToken?: string | null): MCPServerConfig[] {
  const servers: MCPServerConfig[] = [];
  const token = githubToken || process.env.GITHUB_TOKEN;

  if (token) {
    servers.push({
      name: 'github',
      url: process.env.GITHUB_MCP_URL ?? 'https://api.githubcopilot.com/mcp/',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-MCP-Readonly': process.env.GITHUB_MCP_READONLY ?? 'true',
      },
      description: 'GitHub repositories, issues, pull requests, and code search',
    });
  }

  if (process.env.GMAIL_MCP_TOKEN) {
    servers.push({
      name: 'gmail',
      url: process.env.GMAIL_MCP_URL ?? 'https://gmailmcp.googleapis.com/mcp/v1',
      headers: {
        Authorization: `Bearer ${process.env.GMAIL_MCP_TOKEN}`,
      },
      description: 'Gmail messages, threads, drafts, and labels',
    });
  }

  if (process.env.GDOCS_MCP_URL) {
    servers.push({
      name: 'google-docs',
      url: process.env.GDOCS_MCP_URL,
      headers: process.env.GDOCS_MCP_TOKEN
        ? { Authorization: `Bearer ${process.env.GDOCS_MCP_TOKEN}` }
        : undefined,
      description: 'Google Docs documents — read, create, edit',
    });
  }

  return servers;
}

export class MCPClientManager {
  private clients = new Map<string, Client>();
  private configs = new Map<string, MCPServerConfig>();
  private connected = false;

  constructor(private servers: MCPServerConfig[]) {}

  async connectAll(): Promise<void> {
    if (this.connected) return;

    const results = await Promise.allSettled(
      this.servers.map(async (cfg) => {
        const transport = new StreamableHTTPClientTransport(new URL(cfg.url), {
          requestInit: { headers: cfg.headers },
        });

        const client = new Client(
          { name: `alphanex-research-agent-${cfg.name}`, version: '1.0.0' },
          { capabilities: {} }
        );

        await client.connect(transport);
        this.clients.set(cfg.name, client);
        this.configs.set(cfg.name, cfg);
        console.log(`MCP connected: ${cfg.name} (${cfg.url})`);
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'rejected') {
        console.warn(
          `MCP connection failed for '${this.servers[i].name}':`,
          (r as PromiseRejectedResult).reason?.message ?? (r as PromiseRejectedResult).reason
        );
      }
    }

    this.connected = true;
  }

  async listAllTools(): Promise<DiscoveredTool[]> {
    await this.connectAll();
    const all: DiscoveredTool[] = [];

    for (const [serverName, client] of this.clients) {
      try {
        const { tools } = await client.listTools();
        for (const t of tools) {
          all.push({
            serverName,
            toolName: t.name,
            description: t.description ?? '',
            inputSchema: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<
              string,
              unknown
            >,
          });
        }
      } catch (e) {
        console.warn(`listTools failed for '${serverName}':`, e);
      }
    }

    return all;
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server '${serverName}' is not connected.`);
    }

    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  }

  async closeAll(): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        await client.close();
      } catch (e) {
        console.warn(`Failed to close MCP client '${name}':`, e);
      }
    }
    this.clients.clear();
    this.configs.clear();
    this.connected = false;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get serverNames(): string[] {
    return [...this.clients.keys()];
  }
}

let _manager: MCPClientManager | null = null;
let _managerToken: string | null = null;

export function getMCPManager(githubToken?: string | null): MCPClientManager {
  const token = githubToken || process.env.GITHUB_TOKEN || null;
  if (!_manager || _managerToken !== token) {
    _manager = new MCPClientManager(defaultMCPServers(token));
    _managerToken = token;
  }
  return _manager;
}
