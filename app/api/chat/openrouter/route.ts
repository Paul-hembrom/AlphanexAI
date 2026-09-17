import { NextRequest, NextResponse } from 'next/server';
import { getOpenRouterApiKey, streamOpenRouter } from '@/lib/openrouter';
import { WorkMode } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Dedicated OpenRouter Chat Completion Route
 *
 * Route: POST /api/chat/openrouter
 *
 * Security:
 * - Reads OPENROUTER_API_KEY from server environment only (process.env.OPENROUTER_API_KEY).
 * - Never returns or leaks the API key in client headers or body.
 * - Backend strictly enforces token limits based on effort tags.
 */
export async function POST(req: NextRequest) {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Missing OPENROUTER_API_KEY',
        message:
          'OpenRouter API key is not configured on the server. Please add OPENROUTER_API_KEY to your environment secrets.',
      },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    prompt = '',
    modelId = 'qwen-3-8-flash',
    mode = 'developer',
    reasoningEffort = 'Medium',
    params = {},
    history = [],
  } = body;

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json(
      { error: 'Prompt is required' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await streamOpenRouter({
          apiKey,
          modelId,
          prompt,
          mode: (mode as WorkMode) || 'developer',
          reasoningEffort,
          history,
          params,
          sendEvent,
          signal: req.signal,
        });
        controller.close();
      } catch (err: any) {
        console.error('OpenRouter stream execution error:', err?.message || err);
        sendEvent({
          type: 'content',
          content: `\n\n> **OpenRouter Router Notice**: ${
            err?.message || 'Connection interrupted while streaming from model provider.'
          }`,
        });
        sendEvent({
          type: 'done',
          tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
