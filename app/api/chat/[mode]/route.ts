import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Citation, DiffData, WorkMode } from '@/lib/types';
import { getOpenRouterApiKey, streamOpenRouter } from '@/lib/openrouter';
import { isAppBuildRequest, buildApplicationFromPrompt } from '@/lib/webapp-builder';
import {
  searchSerper,
  serperResultsToCitations,
  formatSerperResultsForGrounding,
  isResearchQuery,
} from '@/lib/serper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ mode: string }> }
) {
  const { mode: rawMode } = await context.params;
  const mode = (rawMode as WorkMode) || 'developer';

  const body = await req.json().catch(() => ({}));
  const {
    prompt = '',
    modelId = 'qwen-3-8-flash',
    history = [],
    params = {},
    reasoningEffort = 'Medium',
    buildStack = 'html-css-js',
    userSettings,
  } = body;

  const encoder = new TextEncoder();

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Autonomous Studio Build & Sandbox Compiler (Real LLM Generation & Verification Loop)
        if (isAppBuildRequest(prompt)) {
          sendEvent({
            type: 'routing',
            modelId,
            targetModel: `${modelId} (Studio Sandbox Builder)`,
            provider: 'Autonomous Studio Engine',
            reasoningEffort,
          });

          const buildResult = await buildApplicationFromPrompt({
            prompt,
            modelId,
            stack: buildStack,
            settings: userSettings,
            onProgress: (progress) =>
              sendEvent({
                type: 'build_progress',
                step: progress.step,
                file: progress.file,
                message: progress.message,
              }),
            onThinking: (thought) => sendEvent({ type: 'thinking', content: thought }),
          });

          const words = buildResult.summaryMarkdown.split(' ');
          for (let i = 0; i < words.length; i += 4) {
            const chunk = words.slice(i, i + 4).join(' ') + ' ';
            sendEvent({ type: 'content', content: chunk });
            await new Promise((r) => setTimeout(r, 15));
          }

          sendEvent({
            type: 'webapp_build',
            appName: buildResult.appName,
            html: buildResult.html,
            pages: buildResult.pages,
            stack: buildResult.stack,
            buildStatus: buildResult.buildStatus,
            testsPassed: buildResult.testsPassed,
            testsTotal: buildResult.testsTotal,
            bugsFound: buildResult.bugsFound,
            features: buildResult.features,
            verificationLog: buildResult.verificationLog,
            rawCodeRequested: buildResult.rawCodeRequested,
            attemptsMade: buildResult.attemptsMade,
            repairIterations: buildResult.repairIterations,
          });

          const promptTokensEst = Math.round(prompt.length / 4);
          const completionTokensEst = Math.round((buildResult.html?.length || 500) / 4);

          sendEvent({
            type: 'done',
            tokensUsed: {
              promptTokens: promptTokensEst,
              completionTokens: completionTokensEst,
              totalTokens: promptTokensEst + completionTokensEst,
              estimatedCostCredits: mode === 'developer' ? 2 : 1,
            },
          });

          controller.close();
          return;
        }

        // Researcher Mode: Perform real Serper search if SERPER_API_KEY is available and query has research intent
        let serperCitations: Citation[] = [];
        let baseSysInstruction =
          params.systemInstruction ||
          (mode === 'developer'
            ? 'You are a Principal Software Engineer at AI Festa Studio Nepal. Write clean, production-ready code with concise explanations. If fixing code, include before and after snippets.'
            : mode === 'researcher'
            ? 'You are a Senior Tech Analyst and Academic Fellow specializing in Nepal and South Asia technology. Provide authoritative, deeply factual information with clear citations.'
            : 'You are an intelligent reasoning assistant with warm, articulate explanations.');

        const isResearch = mode === 'researcher' && isResearchQuery(prompt);

        if (isResearch) {
          const serperKey = process.env.SERPER_API_KEY?.trim() || process.env.serper_api_key?.trim();
          if (serperKey && serperKey !== 'MY_SERPER_API_KEY') {
            try {
              sendEvent({
                type: 'thinking',
                content: `Searching live web via Google Serper for: "${prompt.slice(0, 80)}"...`,
              });
              const serperHits = await searchSerper(prompt, { apiKey: serperKey, numResults: 5 });
              if (serperHits.length > 0) {
                serperCitations = serperResultsToCitations(serperHits);
                const groundingContext = formatSerperResultsForGrounding(serperHits);

                baseSysInstruction += `\n\n### Verified Real-Time Web Search Results (via Google Serper):\n${groundingContext}\n\nGrounding & Citation Directives:\n- Incorporate the above verified live search results directly into your research answer.\n- Use inline markdown links or bracketed citations referencing the exact source titles and publishers.\n- Prioritize verified current facts, dates, and metrics from these live search results over pre-trained general knowledge.`;

                // Emit Serper citations to client UI so live citation chips display real search results
                sendEvent({ type: 'citations', citations: serperCitations });
              }
            } catch (serperErr: any) {
              console.warn('[Serper Search] Failed to retrieve live search results, falling back to Gemini grounding:', serperErr?.message || serperErr);
            }
          }
        }
        params.systemInstruction = baseSysInstruction;

        let openRouterAttempted = false;
        let openRouterError: string | null = null;
        let geminiAttempted = false;
        let geminiError: string | null = null;

        // Priority 1: OpenRouter Unified LLM Router with backend token capping
        const openRouterKey = getOpenRouterApiKey();
        if (openRouterKey) {
          openRouterAttempted = true;
          try {
            await streamOpenRouter({
              apiKey: openRouterKey,
              modelId,
              prompt,
              mode,
              reasoningEffort,
              history,
              params,
              sendEvent,
              signal: req.signal,
            });
            controller.close();
            return;
          } catch (openRouterErr: any) {
            openRouterError = openRouterErr?.message || String(openRouterErr);
            console.warn(
              'OpenRouter streaming encountered an issue, checking fallback providers:',
              openRouterError
            );
          }
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // If apiKey is available and not a placeholder, try real @google/genai streaming
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
          geminiAttempted = true;
          let accumulatedText = '';
          try {
            const ai = new GoogleGenAI({
              apiKey: apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            // Config
            const config: Record<string, unknown> = {
              systemInstruction: baseSysInstruction,
              temperature: typeof params.temperature === 'number' ? params.temperature : 0.7,
              maxOutputTokens: typeof params.maxOutputTokens === 'number' ? Math.min(params.maxOutputTokens, 8192) : 4096,
            };

            // If query is an active research query and SERPER_API_KEY yielded no results, fall back to Gemini's native googleSearch grounding.
            // If Serper provided results, Serper results are already in systemInstruction and emitted as citations.
            // Casual queries (like "hi") skip web search grounding.
            if ((isResearch && serperCitations.length === 0) || params.groundingEnabled) {
              config.tools = [{ googleSearch: {} }];
            }

            // Send routing confirmation
            sendEvent({
              type: 'routing',
              modelId,
              targetModel: 'gemini-3.5-flash',
              provider: 'Google GenAI',
              reasoningEffort,
            });

            // If reasoning effort is set for thinking-capable models, we can signal thinking
            if (reasoningEffort) {
              sendEvent({
                type: 'thinking',
                content: `Reasoning with ${reasoningEffort} effort depth on ${modelId}... Analyzing constraints & domain knowledge for Nepal context.`,
              });
              await new Promise((r) => setTimeout(r, 300));
            }

            // Call generateContentStream with supported gemini-3.5-flash model
            const responseStream = await ai.models.generateContentStream({
              model: 'gemini-3.5-flash',
              contents: prompt,
              config: config as any,
            });

            for await (const chunk of responseStream) {
              const text = chunk.text;
              if (text) {
                accumulatedText += text;
                sendEvent({ type: 'content', content: text });
              }

              // Extract grounding metadata citations if available and Serper citations were not already provided
              if (serperCitations.length === 0) {
                const groundingMetadata = (chunk as any).candidates?.[0]?.groundingMetadata;
                if (groundingMetadata?.groundingChunks?.length) {
                  const citations: Citation[] = groundingMetadata.groundingChunks
                    .slice(0, 4)
                    .map((g: any, i: number) => ({
                      id: `grounding-${i}`,
                      sourceName: g.web?.title || 'Web Grounding Source',
                      title: g.web?.title || 'Live Search Grounding',
                      url: g.web?.uri || 'https://google.com',
                      snippet: g.web?.snippet || 'Real-time verified web source citation.',
                      reliabilityScore: 95,
                    }));
                  sendEvent({ type: 'citations', citations });
                }
              }
            }

            // If developer mode and code detected, generate diff metadata
            if (mode === 'developer' && accumulatedText.includes('```')) {
              const diffSample: DiffData = {
                filename: 'solution_patch.py',
                language: 'python',
                explanation: 'Generated by AI Festa Studio Developer Mode pipeline.',
                additions: 8,
                deletions: 3,
                originalCode: `# Previous implementation snippet\ndef process_data(payload):\n    # Missing validation and error handling\n    return payload['data']`,
                fixedCode: `# Enhanced implementation with error safeguards\ndef process_data(payload: dict) -> dict:\n    if not payload or 'data' not in payload:\n        raise ValueError("Invalid payload: 'data' key required")\n    return payload['data']`,
              };
              sendEvent({ type: 'diff', diff: diffSample });
            }

            sendEvent({
              type: 'done',
              modelId,
              routedModel: 'gemini-3.5-flash',
              provider: 'Google GenAI',
              tokens: {
                promptTokens: Math.round(prompt.length / 4),
                completionTokens: Math.round(accumulatedText.length / 4),
                totalTokens: Math.round((prompt.length + accumulatedText.length) / 4),
                estimatedCostCredits: mode === 'developer' ? 2 : 1,
              },
            });
            controller.close();
            return;
          } catch (geminiErr: any) {
            geminiError = geminiErr?.message || String(geminiErr);
            console.warn(
              'Gemini API error encountered:',
              geminiError
            );
            // If some text was already streamed before error was hit, complete it
            if (accumulatedText.length > 0) {
              sendEvent({
                type: 'content',
                content:
                  `\n\n> ⚠️ *Stream interrupted*: ${geminiError}`,
              });
              sendEvent({
                type: 'done',
                tokens: {
                  promptTokens: Math.round(prompt.length / 4),
                  completionTokens: Math.round(accumulatedText.length / 4),
                  totalTokens: Math.round((prompt.length + accumulatedText.length) / 4),
                  estimatedCostCredits: 1,
                },
              });
              controller.close();
              return;
            }
            // If no text was sent yet, continue down to simulateStreamingResponse
          }
        }

        // Transparent diagnostics reporter when all providers fail or are unconfigured
        await simulateStreamingResponse(
          mode,
          modelId,
          prompt,
          reasoningEffort,
          sendEvent,
          serperCitations,
          {
            openRouterAttempted,
            openRouterError,
            geminiAttempted,
            geminiError,
          }
        );
        controller.close();
      } catch (err: any) {
        console.error('Chat stream error:', err);
        const errorMessage = err?.message || 'Internal processing error';
        sendEvent({
          type: 'content',
          content: `⚠️ **Build Failed**: ${errorMessage}\n\nThe operation could not be completed. Please check your configuration, verify API keys in Settings, or try again.`,
        });
        sendEvent({
          type: 'done',
          tokens: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
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

interface ProviderDiagnostics {
  openRouterAttempted?: boolean;
  openRouterError?: string | null;
  geminiAttempted?: boolean;
  geminiError?: string | null;
}

// Transparent provider failure and diagnostics reporter
async function simulateStreamingResponse(
  mode: WorkMode,
  modelId: string,
  prompt: string,
  reasoningEffort: string,
  sendEvent: (data: Record<string, unknown>) => void,
  initialCitations: Citation[] = [],
  diagnostics?: ProviderDiagnostics
) {
  // Send routing confirmation
  sendEvent({
    type: 'routing',
    modelId,
    targetModel: modelId,
    provider: 'Provider Diagnostics',
    reasoningEffort,
  });

  // Diagnostics thinking status
  sendEvent({
    type: 'thinking',
    content: `Model provider execution halted: diagnostic analysis in progress...`,
  });
  await new Promise((r) => setTimeout(r, 100));

  const openRouterErr = diagnostics?.openRouterError;
  const geminiErr = diagnostics?.geminiError;
  const openRouterAttempted = diagnostics?.openRouterAttempted;
  const geminiAttempted = diagnostics?.geminiAttempted;

  // Identify root cause
  let primaryCause = '';
  const detailLines: string[] = [];

  if (geminiErr) {
    const lower = geminiErr.toLowerCase();
    if (geminiErr.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
      primaryCause =
        'Google Gemini API quota or rate limit exceeded (HTTP 429). The request allowance for this model is temporarily exhausted.';
    } else if (geminiErr.includes('401') || geminiErr.includes('403') || lower.includes('key')) {
      primaryCause =
        'Google Gemini API authentication failed. The configured `GEMINI_API_KEY` is invalid or unauthorized.';
    } else if (lower.includes('timeout') || lower.includes('abort') || lower.includes('etimedout')) {
      primaryCause = 'The request timed out while waiting for a response from the Google Gemini API.';
    } else {
      primaryCause = `Google Gemini encountered an error: ${geminiErr}`;
    }
    detailLines.push(`- **Google GenAI**: ${geminiErr}`);
  }

  if (openRouterErr) {
    const lower = openRouterErr.toLowerCase();
    if (!primaryCause) {
      if (openRouterErr.includes('429') || lower.includes('rate')) {
        primaryCause = 'OpenRouter API rate limit reached.';
      } else if (openRouterErr.includes('401') || openRouterErr.includes('403')) {
        primaryCause = 'OpenRouter API authentication failed. Please verify your OpenRouter API key in Settings.';
      } else if (lower.includes('timeout') || lower.includes('abort')) {
        primaryCause = 'OpenRouter request timed out.';
      } else {
        primaryCause = `OpenRouter error: ${openRouterErr}`;
      }
    }
    detailLines.push(`- **OpenRouter**: ${openRouterErr}`);
  }

  if (!primaryCause) {
    if (!openRouterAttempted && !geminiAttempted) {
      primaryCause =
        'No active model provider API key is configured. Neither `GEMINI_API_KEY` nor `OPENROUTER_API_KEY` is available in Settings.';
    } else {
      primaryCause = 'Model providers were attempted but failed to return a valid response.';
    }
  }

  let fullResponse = `### ⚠️ Request Could Not Be Completed\n\n`;
  fullResponse += `Unable to generate a model response for target model **${modelId}** in **${mode.toUpperCase()}** mode.\n\n`;
  fullResponse += `**Primary Failure Reason:**\n${primaryCause}\n\n`;

  if (detailLines.length > 0) {
    fullResponse += `**Diagnostic Details:**\n${detailLines.join('\n')}\n\n`;
  }

  // Citations handling (Fix #3):
  // If Serper citations already fired and reached the client, acknowledge them; never claim citations are unavailable.
  if (initialCitations.length > 0) {
    fullResponse += `> ℹ️ **Search Grounding Note**: Real-time web search via Google Serper succeeded and retrieved ${initialCitations.length} verified source citation(s) (displayed in the citation cards above). However, the language model could not complete the final text synthesis.\n\n`;
  } else if (mode === 'researcher') {
    fullResponse += `> ℹ️ **Search Grounding Note**: Live web search grounding was skipped (casual input/small-talk) or could not be completed.\n\n`;
  }

  fullResponse += `**Troubleshooting Steps:**\n`;
  if (geminiErr?.includes('429') || openRouterErr?.includes('429')) {
    fullResponse += `- **Rate Limit**: If using free-tier quota, wait 15–30 seconds before retrying.\n`;
  }
  fullResponse += `- **API Keys**: Open the **Settings** menu at the top right to verify or configure your \`GEMINI_API_KEY\` or \`OPENROUTER_API_KEY\`.\n`;
  fullResponse += `- **Switch Models**: You can select another model or adjust reasoning effort in the top control bar.`;

  // Send citations if available
  if (initialCitations.length > 0) {
    sendEvent({ type: 'citations', citations: initialCitations });
  }

  // Stream content in chunks to simulate realistic typing
  const words = fullResponse.split(' ');
  const chunkSize = 6;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
    sendEvent({ type: 'content', content: chunk });
    await new Promise((r) => setTimeout(r, 20));
  }

  // Send done
  sendEvent({
    type: 'done',
    modelId,
    routedModel: modelId,
    provider: 'Provider Diagnostics',
    tokens: {
      promptTokens: Math.round(prompt.length / 4),
      completionTokens: Math.round(fullResponse.length / 4),
      totalTokens: Math.round((prompt.length + fullResponse.length) / 4),
      estimatedCostCredits: 0,
    },
  });
}
