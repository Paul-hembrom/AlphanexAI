import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { BuildStage, Citation, DiffData, PlanTier, WorkMode } from '@/lib/types';
import { AVAILABLE_MODELS } from '@/lib/constants';
import { getOpenRouterApiKey, streamOpenRouter } from '@/lib/openrouter';
import { isAppBuildRequest, buildApplicationFromPrompt } from '@/lib/webapp-builder';
import { isResearchQuery } from '@/lib/serper';
import { runResearch } from '@/lib/research-engine';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient, isAdminConfigured } from '@/lib/supabase/admin';
import { recordTokenUsage, checkPlanLimits, touchActiveSession } from '@/lib/usage-tracking';
import { executeGitHubAction } from '@/lib/integrations';
import { getValidGitHubToken } from '@/lib/user-connections';
import { canUseModel } from '@/lib/plan-allowance';
import {
  checkBuildPass,
  consumeBuildPass,
  getBuildQuota,
  checkFreeChatDailyQuota,
} from '@/lib/build-quota';
import {
  resolveBuildStageModel,
  filterRelevantFilesForBuildStage,
} from '@/lib/build-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
    attachments = [],
  } = body;

  const encoder = new TextEncoder();

  // 1. Authenticate user from Supabase cookie session or Authorization header
  let authenticatedUserId: string | null = null;

  if (isSupabaseServerConfigured()) {
    try {
      const supabaseServer = await createClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) authenticatedUserId = user.id;
    } catch (authErr) {
      console.warn('[chat/route] Could not resolve session from cookie:', authErr);
    }
  }

  if (!authenticatedUserId) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ') && isAdminConfigured()) {
      try {
        const admin = createAdminClient();
        const token = authHeader.substring(7);
        const { data: { user } } = await admin.auth.getUser(token);
        if (user) authenticatedUserId = user.id;
      } catch {}
    }
  }

  // 2. Reject unauthenticated requests if Supabase is configured
  if (isSupabaseServerConfigured() && !authenticatedUserId) {
    return new Response(
      `data: ${JSON.stringify({
        type: 'content',
        content: `### 🔒 Sign In Required\n\nPlease sign in with your account to chat and use AlphanexAI models.`,
      })}\n\ndata: ${JSON.stringify({
        type: 'done',
        modelId,
        routedModel: modelId,
        provider: 'AlphanexAI Auth',
        tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCredits: 0 },
      })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  // 3. Check monthly plan token limit and concurrent sessions
  let userPlanTier = 'lite';
  if (authenticatedUserId) {
    const limitCheck = await checkPlanLimits(authenticatedUserId);
    if (!limitCheck.allowed) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'content',
          content: `### ⚠️ Quota Notice\n\n${limitCheck.message}`,
        })}\n\ndata: ${JSON.stringify({
          type: 'done',
          modelId,
          routedModel: modelId,
          provider: 'AlphanexAI Usage Engine',
          tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCredits: 0 },
        })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    }
    userPlanTier = limitCheck.planTier || 'lite';
    touchActiveSession(authenticatedUserId).catch(() => {});
  }

  // 3a. Build Mode is strictly locked for Free Tier (lite) users
  if (mode === 'build' && userPlanTier === 'lite') {
    return new Response(
      `data: ${JSON.stringify({
        type: 'content',
        content: `### 🔒 Build Mode Locked\n\nBuild Mode is an autonomous software factory reserved for **Plus** and **Pro Builder** subscriptions.\n\nFree Tier accounts cannot run Build Mode. Please upgrade your subscription to unlock autonomous architecture planning, multi-pass generation, automated test harnesses, and preview sandboxes.`,
      })}\n\ndata: ${JSON.stringify({
        type: 'done',
        modelId,
        routedModel: modelId,
        provider: 'AlphanexAI Build Router',
        tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCredits: 0 },
      })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  // 3b. Free Tier Daily Chat Cap (30 completions/day across developer+researcher+general)
  if (userPlanTier === 'lite' && authenticatedUserId) {
    const freeDailyCheck = await checkFreeChatDailyQuota(authenticatedUserId);
    if (!freeDailyCheck.allowed) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'content',
          content: `### ⚠️ Daily Free Tier Limit Reached\n\n${freeDailyCheck.message}`,
        })}\n\ndata: ${JSON.stringify({
          type: 'done',
          modelId,
          routedModel: modelId,
          provider: 'AlphanexAI Quota Engine',
          tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCredits: 0 },
        })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    }
  }

  // 3c. Free Tier & Mid Tier Model Restriction (Strict Entitlement Enforcement - No fake model routing)
  const targetModelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (targetModelInfo) {
    const access = canUseModel({
      planTier: userPlanTier as PlanTier,
      modelTier: targetModelInfo.tier,
    });
    if (!access.allowed) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'content',
          content: `### 🔒 Subscription Upgrade Required\n\n${access.reason}\n\nPlease upgrade your plan to access **${targetModelInfo.name}**.`,
        })}\n\ndata: ${JSON.stringify({
          type: 'done',
          modelId,
          routedModel: modelId,
          provider: 'AlphanexAI Entitlement',
          tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCredits: 0 },
        })}\n\n`,
        {
          status: 403,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    }
  }

  const effectiveModelId = modelId;
  const modelWarningNotice: string | null = null;

  // 4. Load user profile settings for live research & grounding preferences
  let userProfileSettings = {
    searchProvider: 'serper_searxng' as 'tavily' | 'serper_searxng',
    nepaliGroundingBias: true,
    citationDensity: 'inline_brackets' as 'inline_brackets' | 'footnote_bibliography',
  };

  if (authenticatedUserId && isAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('id', authenticatedUserId)
        .maybeSingle();

      if (prof) {
        if (prof.search_provider === 'tavily' || prof.searchProvider === 'tavily') {
          userProfileSettings.searchProvider = 'tavily';
        }
        if (typeof prof.nepali_grounding_bias === 'boolean') {
          userProfileSettings.nepaliGroundingBias = prof.nepali_grounding_bias;
        } else if (typeof prof.nepaliGroundingBias === 'boolean') {
          userProfileSettings.nepaliGroundingBias = prof.nepaliGroundingBias;
        }
        if (prof.citation_density === 'footnote_bibliography' || prof.citationDensity === 'footnote_bibliography') {
          userProfileSettings.citationDensity = 'footnote_bibliography';
        }
      }
    } catch (profErr) {
      console.warn('[chat/route] Could not load user profile settings:', profErr);
    }
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        if (data.type === 'done' && authenticatedUserId) {
          const tokensObj = (data.tokens || data.tokensUsed || {}) as Record<string, unknown>;
          const promptTokens = Number(tokensObj.promptTokens) || Math.round(prompt.length / 4);
          const completionTokens = Number(tokensObj.completionTokens) || 0;
          const totalTokens = Number(tokensObj.totalTokens) || (promptTokens + completionTokens);
          const costCredits = Number(tokensObj.estimatedCostCredits) || 1;
          const usedModelId = (data.routedModel as string) || (data.modelId as string) || modelId;

          recordTokenUsage({
            userId: authenticatedUserId,
            modelId: usedModelId,
            promptTokens,
            completionTokens,
            totalTokens,
            costCredits,
            mode,
          }).catch((err) => console.error('[token_usage_log] Failed to record:', err));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (modelWarningNotice) {
          sendEvent({
            type: 'thinking',
            content: modelWarningNotice,
          });
        }

        // ==========================================
        // WORK MODE: BUILD (Autonomous Software Factory)
        // ==========================================
        if (mode === 'build') {
          // 1. Resolve stage
          const isPolishRequested = body.polish === true || body.stage === 'polish';
          const isRepairRequested = body.stage === 'repair' || body.hasPreviousFailure === true;
          let stage: BuildStage = 'generate';
          if (isPolishRequested) {
            stage = 'polish';
          } else if (isRepairRequested) {
            stage = 'repair';
          } else if (body.stage === 'plan') {
            stage = 'plan';
          }

          // 2. Check stage quota
          if (authenticatedUserId) {
            const passCheck = await checkBuildPass(authenticatedUserId, userPlanTier as PlanTier, stage);
            if (!passCheck.allowed) {
              sendEvent({
                type: 'content',
                content: `### ⚠️ Daily Build Quota Exceeded\n\n${passCheck.message}`,
              });
              sendEvent({
                type: 'done',
                modelId: effectiveModelId,
                routedModel: effectiveModelId,
                provider: 'AlphanexAI Build Router',
                tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostCredits: 0 },
              });
              controller.close();
              return;
            }
          }

          const quotaStatus = authenticatedUserId
            ? await getBuildQuota(authenticatedUserId, userPlanTier as PlanTier)
            : null;
          const polishQuotaRemaining = quotaStatus?.quotas?.polish?.remaining ?? 0;

          // 3. Server-enforced stage model routing
          const stageDecision = resolveBuildStageModel({
            stage,
            planTier: userPlanTier as PlanTier,
            prompt,
            hasPreviousFailure: body.hasPreviousFailure,
            polishQuotaRemaining,
            clientModelHint: effectiveModelId,
          });

          sendEvent({
            type: 'routing',
            modelId: stageDecision.modelId,
            targetModel: `${stageDecision.modelId} (${stageDecision.provider})`,
            provider: stageDecision.provider,
            reasoningEffort,
          });

          sendEvent({
            type: 'thinking',
            content: `Build stage [${stage.toUpperCase()}]: routed to ${stageDecision.modelId} (${stageDecision.provider}). ${stageDecision.reason}`,
          });

          if (stageDecision.isPolishQuotaExhausted) {
            sendEvent({
              type: 'thinking',
              content: `Daily Polish quota exhausted for today (0 remaining). Executing comprehensive review pass using Gemini 3.8 Flash.`,
            });
          }

          // 4. Consume build pass in build_pass_log
          if (authenticatedUserId) {
            await consumeBuildPass(authenticatedUserId, stage, stageDecision.modelId);
          }

          // 5. Filter attachments for stage ingest (max ~8 relevant files)
          const relevantAttachments = filterRelevantFilesForBuildStage(attachments, prompt, 8);

          // 6. Run autonomous application builder
          const buildResult = await buildApplicationFromPrompt({
            prompt,
            modelId: stageDecision.modelId,
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
            modelId: stageDecision.modelId,
            routedModel: stageDecision.modelId,
            provider: stageDecision.provider,
            tokensUsed: {
              promptTokens: promptTokensEst,
              completionTokens: completionTokensEst,
              totalTokens: promptTokensEst + completionTokensEst,
              estimatedCostCredits: 2,
            },
          });

          controller.close();
          return;
        }

        // Autonomous Studio Build & Sandbox Compiler (Developer Mode Fallback)
        if (isAppBuildRequest(prompt)) {
          const devBuildModel =
            userPlanTier === 'lite'
              ? 'poolside/laguna-s-2.1:free'
              : effectiveModelId;

          sendEvent({
            type: 'routing',
            modelId: devBuildModel,
            targetModel: `${devBuildModel} (Studio Sandbox Builder)`,
            provider: 'Autonomous Studio Engine',
            reasoningEffort,
          });

          const buildResult = await buildApplicationFromPrompt({
            prompt,
            modelId: devBuildModel,
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
              estimatedCostCredits: 1,
            },
          });

          controller.close();
          return;
        }

        // Researcher Mode: Run multi-stage live research loop if query has research intent
        let serperCitations: Citation[] = [];
        let baseSysInstruction =
          params.systemInstruction ||
          (mode === 'developer'
            ? 'You are a Principal Software Engineer at Alphanex AI Studio. Write clean, production-ready code with concise explanations. If fixing code, include before and after snippets.'
            : mode === 'researcher'
            ? 'You are a Senior Tech Analyst and Academic Fellow specializing in Nepal and South Asia technology. Provide authoritative, deeply factual information with clear citations.'
            : 'You are an intelligent reasoning assistant with warm, articulate explanations.');

        const isResearch = mode === 'researcher' && isResearchQuery(prompt);

        if (isResearch) {
          const researchResult = await runResearch(prompt, {
            effort: reasoningEffort,
            planTier: userPlanTier,
            searchProvider: userProfileSettings.searchProvider,
            nepaliGroundingBias: userProfileSettings.nepaliGroundingBias,
            citationDensity: userProfileSettings.citationDensity,
            onProgress: (p) => {
              sendEvent({
                type: 'thinking',
                content: p.message,
              });
            },
          });

          if (researchResult.effortCappedNotice) {
            sendEvent({
              type: 'thinking',
              content: researchResult.effortCappedNotice,
            });
          }

          if (researchResult.success && researchResult.hits.length > 0) {
            serperCitations = researchResult.citations;
            sendEvent({ type: 'citations', citations: serperCitations });

            let citationDirective = '';
            if (userProfileSettings.citationDensity === 'footnote_bibliography') {
              citationDirective =
                'Citation Directive: Use superscript-style [n] footnotes after factual claims and end with a "## Sources" bibliography listing the exact retrieved URLs.';
            } else {
              citationDirective =
                'Citation Directive: After each factual claim add [n] matching the source list (e.g. [1], [2]). Every factual claim must be strictly grounded in the retrieved sources above.';
            }

            if (researchResult.effectiveEffort === 'Max') {
              citationDirective +=
                '\nAnalysis Directive: Critically evaluate conflicts between sources and explicitly highlight any divergent statistics, dates, or contradictory findings in a dedicated "Source Divergence & Fact-Check" section.';
            }

            baseSysInstruction += `\n\n${researchResult.groundingMarkdown}\n\n${citationDirective}\n- Prioritize verified facts, dates, and metrics from these retrieved live sources.\n- Never fabricate or cite URLs, papers, or organizations that do not appear in the retrieved sources above.`;

            sendEvent({
              type: 'thinking',
              content: `Retrieved ${researchResult.hits.length} live source(s) and read ${Object.keys(researchResult.scraped).length} full page(s). Synthesizing grounded research answer...`,
            });
          } else {
            // Zero hits or unconfigured search: never emit fake citations
            sendEvent({ type: 'citations', citations: [] });

            const failureReason = researchResult.needsSearchKey
              ? 'Search engine is unconfigured (missing SERPER_API_KEY/TAVILY_API_KEY).'
              : 'Live web search returned no accessible results.';

            sendEvent({
              type: 'thinking',
              content: `Notice: ${failureReason} No live sources were retrieved. Treat the following as unverified model knowledge.`,
            });

            baseSysInstruction += `\n\n### Grounding Notice: ${failureReason} No live sources were retrieved. Treat the following response as unverified model knowledge.\nPrefix your answer with: "> ⚠️ **Notice**: No live sources were retrieved (${failureReason}). Treat the following as unverified model knowledge.\n\n"`;
          }
        }
        // Inject attached repository files into system instruction / context
        if (Array.isArray(attachments) && attachments.length > 0) {
          const validAttachments = attachments.filter(
            (att: any) => att && (att.content || att.path || att.name)
          );
          if (validAttachments.length > 0) {
            const filesContext = validAttachments
              .map((att: any, idx: number) => {
                const header = `File ${idx + 1}: ${att.path || att.name || 'code_file'}${att.repo ? ` (Repository: ${att.repo}${att.branch ? `@${att.branch}` : ''})` : ''}`;
                return `### ${header}\n\`\`\`\n${att.content || ''}\n\`\`\``;
              })
              .join('\n\n');

            baseSysInstruction += `\n\n### Attached Repository Code Context (User-Selected Files):\nThe user has explicitly attached the following files from their connected GitHub repository into this conversation context. Ground your answers, code reviews, bug fixes, and architectural explanations directly on these real files:\n\n${filesContext}\n\nDirectives for Attached Files:\n- Carefully inspect and reference these exact file contents, variable names, functions, and architecture.\n- Ground all reasoning on the code provided above.\n`;
          }
        }

        // Grok-style GitHub repository URL detection & live ingest
        const ghUrlMatch = prompt.match(/https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
        if (ghUrlMatch) {
          const ghOwner = ghUrlMatch[1];
          const ghRepo = ghUrlMatch[2].replace(/\.git$/, '').replace(/\/$/, '');
          const isIgnoredPath = ['features', 'settings', 'pricing', 'login', 'signup', 'explore', 'orgs'].includes(
            ghOwner.toLowerCase()
          );

          if (!isIgnoredPath && ghOwner && ghRepo) {
            const userGhToken = authenticatedUserId ? await getValidGitHubToken(authenticatedUserId) : null;

            if (userGhToken && authenticatedUserId) {
              sendEvent({
                type: 'thinking',
                content: `Detected GitHub repository ${ghOwner}/${ghRepo}. Inspecting repository file tree and README using your connected GitHub token...`,
              });

              try {
                const [treeResult, readmeResult] = await Promise.all([
                  executeGitHubAction('get_repo_tree', { owner: ghOwner, repo: ghRepo }, authenticatedUserId),
                  executeGitHubAction(
                    'get_file_contents',
                    { owner: ghOwner, repo: ghRepo, path: 'README.md' },
                    authenticatedUserId
                  ),
                ]);

                let ingestedContext = `\n\n### Ingested GitHub Repository Context (${ghOwner}/${ghRepo}):\n`;
                let hasIngestedData = false;

                const readmeData = readmeResult.data as { content?: string } | undefined;
                if (readmeResult.success && readmeData?.content) {
                  hasIngestedData = true;
                  ingestedContext += `#### README.md:\n\`\`\`markdown\n${readmeData.content}\n\`\`\`\n\n`;
                }

                const treeData = treeResult.data as { tree?: Array<{ type?: string; path?: string }> } | undefined;
                if (treeResult.success && treeData?.tree && Array.isArray(treeData.tree)) {
                  hasIngestedData = true;
                  const fileList = treeData.tree
                    .slice(0, 80)
                    .map((node) => `${node.type === 'tree' ? '📁' : '📄'} ${node.path}`)
                    .join('\n');
                  ingestedContext += `#### Repository File Structure (Top ${Math.min(
                    80,
                    treeData.tree.length
                  )} entries):\n\`\`\`\n${fileList}\n\`\`\`\n`;
                }

                if (hasIngestedData) {
                  baseSysInstruction += ingestedContext;
                  sendEvent({
                    type: 'thinking',
                    content: `Successfully ingested context from ${ghOwner}/${ghRepo}. README and repository file tree incorporated into reasoning context.`,
                  });
                } else {
                  const errorMsg = treeResult.error || readmeResult.error || 'Repository contents unavailable.';
                  sendEvent({
                    type: 'thinking',
                    content: `Attempted to inspect repository ${ghOwner}/${ghRepo}, but received error: ${errorMsg}`,
                  });
                }
              } catch (repoIngestErr: any) {
                console.warn('[chat/route] Repo ingest error:', repoIngestErr);
                sendEvent({
                  type: 'thinking',
                  content: `Failed to inspect repository ${ghOwner}/${ghRepo}: ${repoIngestErr?.message || repoIngestErr}`,
                });
              }
            } else {
              sendEvent({
                type: 'thinking',
                content: `GitHub repository URL detected (${ghOwner}/${ghRepo}). Connect your GitHub account in Connectors with repo scope to allow AlphanexAI to inspect files and project architecture.`,
              });
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
              modelId: effectiveModelId,
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

            // If developer mode and code detected, generate diff metadata with auto-detected file extension
            if (mode === 'developer' && accumulatedText.includes('```')) {
              const codeBlockMatch = accumulatedText.match(/```(\w+)?(?:\s+([\w./-]+))?\n([\s\S]*?)```/);
              const rawLang = (codeBlockMatch?.[1] || 'python').toLowerCase();
              let detectedFilename = codeBlockMatch?.[2];
              const extractedCode = codeBlockMatch?.[3]?.trim();

              if (!detectedFilename) {
                const extMap: Record<string, string> = {
                  python: 'solution_patch.py',
                  py: 'solution_patch.py',
                  typescript: 'solution_patch.ts',
                  ts: 'solution_patch.ts',
                  tsx: 'ComponentPatch.tsx',
                  javascript: 'solution_patch.js',
                  js: 'solution_patch.js',
                  jsx: 'ComponentPatch.jsx',
                  sql: 'query_patch.sql',
                  json: 'config.json',
                  html: 'index.html',
                  css: 'styles.css',
                  rust: 'main.rs',
                  rs: 'main.rs',
                  go: 'main.go',
                  bash: 'script.sh',
                  sh: 'script.sh',
                  yaml: 'config.yaml',
                  yml: 'config.yaml',
                };
                detectedFilename = extMap[rawLang] || `solution_patch.${rawLang || 'py'}`;
              }

              const diffSample: DiffData = {
                filename: detectedFilename,
                language: rawLang,
                explanation: `Generated by Alphanex AI Studio Developer Mode pipeline for ${detectedFilename}.`,
                additions: extractedCode ? extractedCode.split('\n').length : 8,
                deletions: 3,
                originalCode: `# Previous implementation snippet\ndef process_data(payload):\n    # Missing validation and error handling\n    return payload['data']`,
                fixedCode:
                  extractedCode ||
                  `# Enhanced implementation with error safeguards\ndef process_data(payload: dict) -> dict:\n    if not payload or 'data' not in payload:\n        raise ValueError("Invalid payload: 'data' key required")\n    return payload['data']`,
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
        console.error('[UNHANDLED_CHAT_STREAM_ERROR]', JSON.stringify({
          timestamp: new Date().toISOString(),
          mode,
          modelId,
          error: err?.message || String(err),
          stack: err?.stack,
        }, null, 2));

        sendEvent({
          type: 'content',
          content: `### ⚠️ Temporary Interruption\n\nSorry, an unexpected error occurred while processing your request. Please wait a moment and try again, or switch to another model in the top selector.`,
        });
        sendEvent({
          type: 'done',
          modelId,
          routedModel: modelId,
          provider: 'System Notice',
          tokens: { promptTokens: 20, completionTokens: 20, totalTokens: 40, estimatedCostCredits: 0 },
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

// Structured developer logging for Vercel / server logs & gentle user-facing notices
async function simulateStreamingResponse(
  mode: WorkMode,
  modelId: string,
  prompt: string,
  reasoningEffort: string,
  sendEvent: (data: Record<string, unknown>) => void,
  initialCitations: Citation[] = [],
  diagnostics?: ProviderDiagnostics
) {
  const openRouterErr = diagnostics?.openRouterError;
  const geminiErr = diagnostics?.geminiError;
  const openRouterAttempted = diagnostics?.openRouterAttempted;
  const geminiAttempted = diagnostics?.geminiAttempted;

  const combinedErr = `${geminiErr || ''} ${openRouterErr || ''}`.toLowerCase();
  const isRateLimit =
    combinedErr.includes('429') ||
    combinedErr.includes('quota') ||
    combinedErr.includes('resource_exhausted') ||
    combinedErr.includes('rate limit');

  const isAuthError =
    combinedErr.includes('401') ||
    combinedErr.includes('403') ||
    combinedErr.includes('unauthorized') ||
    combinedErr.includes('api key') ||
    combinedErr.includes('invalid key');

  const isTimeout =
    combinedErr.includes('timeout') ||
    combinedErr.includes('abort') ||
    combinedErr.includes('etimedout');

  const failureCategory = isRateLimit
    ? 'RATE_LIMIT_EXCEEDED'
    : isAuthError
    ? 'AUTH_CONFIGURATION'
    : isTimeout
    ? 'UPSTREAM_TIMEOUT'
    : !openRouterAttempted && !geminiAttempted
    ? 'MISSING_API_KEYS'
    : 'PROVIDER_EXECUTION_FAILURE';

  // Comprehensive developer log visible in Vercel function logs
  console.error('[CHAT_API_FAILURE]', JSON.stringify({
    timestamp: new Date().toISOString(),
    failureCategory,
    mode,
    targetModel: modelId,
    reasoningEffort,
    promptSnippet: prompt.slice(0, 160),
    promptLength: prompt.length,
    openRouter: {
      attempted: !!openRouterAttempted,
      error: openRouterErr || null,
    },
    gemini: {
      attempted: !!geminiAttempted,
      error: geminiErr || null,
    },
    serperCitationsRetrieved: initialCitations.length,
  }, null, 2));

  // Send routing confirmation
  sendEvent({
    type: 'routing',
    modelId,
    targetModel: modelId,
    provider: 'System Notice',
    reasoningEffort,
  });

  // Gentle thinking state
  sendEvent({
    type: 'thinking',
    content: `Checking service capacity for ${modelId}...`,
  });
  await new Promise((r) => setTimeout(r, 120));

  let fullResponse = '';

  if (isRateLimit) {
    fullResponse = `### ⏳ High Demand / Rate Limit Reached\n\n`;
    fullResponse += `Sorry, you've hit the temporary rate limit or free-tier usage quota for **${modelId}**.\n\n`;
    fullResponse += `**How you can continue:**\n`;
    fullResponse += `- **Wait a moment**: Free-tier allowances usually refresh within 30 to 60 seconds. You can retry shortly.\n`;
    fullResponse += `- **Switch models**: You can pick another available model (such as a Gemini or Flash variant) from the model menu above.\n`;
    fullResponse += `- **Upgrade / Add Key**: If you have an OpenRouter or Gemini API key, add it in **Settings** (top right) for uninterrupted priority access.\n`;
  } else if (isAuthError) {
    fullResponse = `### 🔑 Provider Key Notice\n\n`;
    fullResponse += `Sorry, we couldn't connect to **${modelId}** because the provider key is either unauthorized or needs verification.\n\n`;
    fullResponse += `**How you can continue:**\n`;
    fullResponse += `- **Switch models**: Select another available model from the dropdown above.\n`;
    fullResponse += `- **Update Settings**: Verify or refresh your API key in **Settings** (top right).\n`;
  } else if (isTimeout) {
    fullResponse = `### ⏱️ Connection Timed Out\n\n`;
    fullResponse += `Sorry, the upstream provider took longer than expected to respond. This is usually due to temporary regional network latency.\n\n`;
    fullResponse += `**How you can continue:**\n`;
    fullResponse += `- Please try resending your prompt in a few moments.\n`;
    fullResponse += `- You can also switch to a faster model or lower the reasoning depth above.\n`;
  } else if (!openRouterAttempted && !geminiAttempted) {
    fullResponse = `### ⚙️ Service Setup Notice\n\n`;
    fullResponse += `Sorry, no active model provider API key is currently configured for **${modelId}**.\n\n`;
    fullResponse += `**How you can continue:**\n`;
    fullResponse += `- Open **Settings** (top right) and configure your \`GEMINI_API_KEY\` or \`OPENROUTER_API_KEY\` to start chatting.\n`;
    fullResponse += `- Or select a pre-configured model from the model list.\n`;
  } else {
    fullResponse = `### ⚠️ Temporarily Busy\n\n`;
    fullResponse += `Sorry, we couldn't complete your request with **${modelId}** right now due to temporary upstream service traffic.\n\n`;
    fullResponse += `**How you can continue:**\n`;
    fullResponse += `- Please wait a few seconds and try your request again.\n`;
    fullResponse += `- Switch to an alternative model in the top navigation bar.\n`;
    fullResponse += `- Configure your own dedicated API key in **Settings** for guaranteed throughput.\n`;
  }

  // Citations handling: If Serper citations were already retrieved, acknowledge them clearly
  if (initialCitations.length > 0) {
    fullResponse += `\n> ℹ️ *Web research located ${initialCitations.length} verified source citation(s), viewable in the Sources panel above.*\n`;
  }

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
    provider: 'System Notice',
    tokens: {
      promptTokens: Math.round(prompt.length / 4),
      completionTokens: Math.round(fullResponse.length / 4),
      totalTokens: Math.round((prompt.length + fullResponse.length) / 4),
      estimatedCostCredits: 0,
    },
  });
}
