// =============================================================================
// lib/mcp-agent.ts
//
// Bridges MCP tools → DeepSeek function calling.
//
// 1. Discovers tools from all connected MCP servers.
// 2. Converts them to OpenAI-compatible function schemas.
// 3. Runs a bounded tool-calling loop: model calls a tool → we execute it
//    (optionally inside a Vercel Sandbox) → feed the result back.
// =============================================================================

import { deepseek, MODEL_ID } from './deepseek';
import { getMCPManager, type DiscoveredTool } from './mcp-clients';
import { runJsInSandbox } from './vercel-sandbox';

/** Maximum tool-call round trips before we force a final answer. */
const MAX_TOOL_ROUNDS = 6;

/**
 * MCP tools whose names suggest they need code execution get routed through
 * a Sandbox. Everything else is called directly over the MCP transport.
 */
const SANDBOX_ROUTED_PATTERNS = [
  /^github_.*code/,
  /^github_.*search/,
  /^google_docs.*batch/,
];

function shouldRouteThroughSandbox(tool: DiscoveredTool): boolean {
  return SANDBOX_ROUTED_PATTERNS.some((re) =>
    re.test(`${tool.serverName}_${tool.toolName}`)
  );
}

/** Convert an MCP tool descriptor to an OpenAI function-calling schema. */
export function toOpenAIFunction(tool: DiscoveredTool) {
  return {
    type: 'function' as const,
    function: {
      name: `${tool.serverName}__${tool.toolName}`,
      description: `[${tool.serverName}] ${tool.description}`.slice(0, 1024),
      parameters: tool.inputSchema,
    },
  };
}

function parseToolName(prefixed: string): { serverName: string; toolName: string } {
  const idx = prefixed.indexOf('__');
  if (idx === -1) throw new Error(`Malformed tool name: ${prefixed}`);
  return {
    serverName: prefixed.slice(0, idx),
    toolName: prefixed.slice(idx + 2),
  };
}

export interface MCPAgentResult {
  /** Final assistant text after the tool loop completes. */
  finalText: string;
  /** Every tool call that was executed, for the audit trail. */
  toolCalls: { server: string; tool: string; args: Record<string, unknown>; result: unknown }[];
  /** Number of round trips used. */
  rounds: number;
}

/**
 * Run a DeepSeek chat completion with MCP tools available.
 */
export async function runMCPAgent(opts: {
  systemPrompt: string;
  userPrompt: string;
  /** Optional: restrict to specific servers (default: all connected). */
  serverFilter?: string[];
  maxRounds?: number;
  /** Called after each tool execution for SSE streaming. */
  onToolCall?: (info: {
    server: string;
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
    round: number;
  }) => void;
  /** Called for each streamed token of the final answer. */
  onToken?: (token: string) => void;
}): Promise<MCPAgentResult> {
  const manager = getMCPManager();
  await manager.connectAll();
  let tools = await manager.listAllTools();

  if (opts.serverFilter?.length) {
    tools = tools.filter((t) => opts.serverFilter!.includes(t.serverName));
  }

  const openAITools = tools.map(toOpenAIFunction);

  const messages: any[] = [
    { role: 'system', content: opts.systemPrompt },
    { role: 'user', content: opts.userPrompt },
  ];

  const executed: MCPAgentResult['toolCalls'] = [];
  const maxRounds = opts.maxRounds ?? MAX_TOOL_ROUNDS;

  for (let round = 0; round < maxRounds; round++) {
    const response = await deepseek.chat.completions.create(
      {
        model: MODEL_ID,
        messages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        tool_choice: openAITools.length > 0 ? 'auto' : undefined,
        temperature: 0.2,
        max_tokens: 4096,
      },
      { timeout: 120_000 }
    );

    const choice = response.choices[0];
    const assistantMsg = choice?.message;
    if (!assistantMsg) break;

    // No tool calls → this is the final answer.
    if (!assistantMsg.tool_calls?.length) {
      const finalText = assistantMsg.content ?? '';
      if (opts.onToken && finalText) opts.onToken(finalText);
      return { finalText, toolCalls: executed, rounds: round + 1 };
    }

    // Echo the assistant message (with tool_calls) back into the thread.
    messages.push(assistantMsg);

    // Execute every tool call in parallel.
    const results = await Promise.allSettled(
      assistantMsg.tool_calls.map(async (call: any) => {
        const { serverName, toolName } = parseToolName(call.function.name);
        const args = JSON.parse(call.function.arguments || '{}');

        const toolMeta = tools.find(
          (t) => t.serverName === serverName && t.toolName === toolName
        );

        let result: unknown;
        if (toolMeta && shouldRouteThroughSandbox(toolMeta)) {
          const sandboxCode = `
            const res = await fetch(${JSON.stringify(
              process.env.MCP_GATEWAY_URL ?? 'https://api.githubcopilot.com/mcp/'
            )}, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { name: ${JSON.stringify(toolName)}, arguments: ${JSON.stringify(args)} },
              }),
            });
            const text = await res.text();
            console.log(text);
          `;
          const sandboxResult = await runJsInSandbox(sandboxCode);
          result = {
            sandboxExitCode: sandboxResult.exitCode,
            stdout: sandboxResult.stdout,
            stderr: sandboxResult.stderr,
          };
        } else {
          result = await manager.callTool(serverName, toolName, args);
        }

        return { serverName, toolName, args, result };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { serverName, toolName, args, result } = r.value;
        executed.push({ server: serverName, tool: toolName, args, result });
        opts.onToolCall?.({
          server: serverName,
          tool: toolName,
          args,
          result,
          round: round + 1,
        });

        const matchedCall = assistantMsg.tool_calls.find(
          (c: any) => c.function.name === `${serverName}__${toolName}`
        );

        messages.push({
          role: 'tool',
          tool_call_id: matchedCall ? matchedCall.id : 'tool_call',
          content: JSON.stringify(result).slice(0, 20_000),
        });
      } else {
        console.warn('⚠️ MCP tool call failed:', r.reason);
        messages.push({
          role: 'tool',
          tool_call_id: 'unknown',
          content: JSON.stringify({ error: String(r.reason) }),
        });
      }
    }
  }

  // Hit round limit — ask for a final answer with tools disabled.
  const finalResponse = await deepseek.chat.completions.create({
    model: MODEL_ID,
    messages: [
      ...messages,
      {
        role: 'user',
        content:
          'You have reached the tool-call limit. Produce your final answer now using only the evidence already gathered.',
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });

  const finalText = finalResponse.choices[0]?.message?.content ?? '';
  if (opts.onToken && finalText) opts.onToken(finalText);
  return { finalText, toolCalls: executed, rounds: maxRounds };
}
