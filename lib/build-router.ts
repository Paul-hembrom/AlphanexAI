/**
 * Build Factory Stage Router
 *
 * Enforces server-authoritative model selection per build stage:
 * - ingest   → cheap coding model: qwen-3-8-flash
 * - plan     → cheap architecture model: qwen-3-8-flash
 * - generate → fast coding model: deepseek-v4-flash (or gemini-3-8-flash on upper)
 * - test     → plus/pro verifier: gemini-3-8-flash
 * - repair   → plus/pro refactor: claude-sonnet-5 (or gemini-3-8-flash)
 * - polish   → max/frontier: claude-fable-5-1 (only if explicit polish request, mid/upper, & quota > 0)
 *
 * Hard-task promotion rules strictly enforce real failures or stack traces.
 * Never promotes cosmetic prompts to Fable.
 */

import { BuildStage, ChatAttachment, PlanTier } from './types';

export interface RouteStageDecision {
  stage: BuildStage;
  modelId: string;
  provider: string;
  reason: string;
  isHardTask: boolean;
  isPolishQuotaExhausted?: boolean;
}

/**
 * Checks if the prompt contains a real runtime exception, stack trace, or cryptographic error.
 */
export function isHardTaskPrompt(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();

  return (
    p.includes('traceback') ||
    p.includes('typeerror') ||
    p.includes('referenceerror') ||
    p.includes('syntaxerror') ||
    p.includes('hmac') ||
    p.includes('sha256') ||
    p.includes('signature verification') ||
    p.includes('401 unauthorized') ||
    p.includes('500 internal server') ||
    /\b(?:error|exception|segfault|core dump|unhandled rejection)\b/i.test(prompt) ||
    /line \d+, in /i.test(prompt)
  );
}

export interface ResolveBuildStageModelParams {
  stage: BuildStage;
  planTier: PlanTier;
  prompt: string;
  hasPreviousFailure?: boolean;
  polishQuotaRemaining?: number;
  clientModelHint?: string;
}

/**
 * Resolves the appropriate model for the current build stage.
 * Ignores client's selectedModelId except as a hint.
 */
export function resolveBuildStageModel(
  params: ResolveBuildStageModelParams
): RouteStageDecision {
  const {
    stage,
    planTier,
    prompt,
    hasPreviousFailure = false,
    polishQuotaRemaining = 0,
  } = params;

  const hardTask = hasPreviousFailure || isHardTaskPrompt(prompt);

  // Ingest stage
  if (stage === 'ingest') {
    return {
      stage: 'ingest',
      modelId: 'qwen-3-8-flash',
      provider: 'Alibaba Cloud / Qwen',
      reason: 'Fast token ingestion and codebase structure mapping',
      isHardTask: false,
    };
  }

  // Plan stage
  if (stage === 'plan') {
    return {
      stage: 'plan',
      modelId: 'qwen-3-8-flash',
      provider: 'Alibaba Cloud / Qwen',
      reason: 'Architecture manifest planning & module dependency mapping',
      isHardTask: false,
    };
  }

  // Generate stage
  if (stage === 'generate') {
    const modelId = planTier === 'upper' ? 'deepseek-v4-flash' : 'deepseek-v4-flash';
    return {
      stage: 'generate',
      modelId,
      provider: 'DeepSeek',
      reason: 'High-throughput code generation & DOM sandbox scaffolding',
      isHardTask: false,
    };
  }

  // Test / Verifier stage
  if (stage === 'test') {
    return {
      stage: 'test',
      modelId: 'gemini-3-8-flash',
      provider: 'Google AI / DeepMind',
      reason: 'Sandbox syntax & component boundary verification',
      isHardTask: hardTask,
    };
  }

  // Repair / Fixer stage
  if (stage === 'repair') {
    // Only promote to Sonnet if there was a real failure or hard task trace
    const modelId = hardTask ? 'claude-sonnet-5' : 'gemini-3-8-flash';
    const provider = hardTask ? 'Anthropic' : 'Google AI / DeepMind';
    return {
      stage: 'repair',
      modelId,
      provider,
      reason: hardTask
        ? 'Targeted refactoring for real sandbox verification failure / stack trace'
        : 'Fast patch repair pass',
      isHardTask: hardTask,
    };
  }

  // Polish stage (Final Review)
  if (stage === 'polish') {
    // Allowed only for mid or upper with quota remaining
    const isEntitled = planTier === 'mid' || planTier === 'upper';
    if (isEntitled && polishQuotaRemaining > 0) {
      return {
        stage: 'polish',
        modelId: 'claude-fable-5-1',
        provider: 'Anthropic Frontier',
        reason: 'Frontier aesthetic audit, layout polish, and edge-case hardening',
        isHardTask: true,
      };
    }

    // Quota exhausted or not entitled: fallback to test-class model
    return {
      stage: 'polish',
      modelId: 'gemini-3-8-flash',
      provider: 'Google AI / DeepMind',
      reason: 'Daily Polish quota exhausted. Running comprehensive review pass via Gemini 3.8 Flash.',
      isHardTask: false,
      isPolishQuotaExhausted: true,
    };
  }

  return {
    stage: 'generate',
    modelId: 'deepseek-v4-flash',
    provider: 'DeepSeek',
    reason: 'Standard generation',
    isHardTask: false,
  };
}

/**
 * Filters and ranks attachments to ensure only relevant files (max ~8)
 * are injected into expensive build stages.
 */
export function filterRelevantFilesForBuildStage(
  attachments: ChatAttachment[],
  prompt: string,
  maxFiles = 8
): ChatAttachment[] {
  if (!attachments || attachments.length <= maxFiles) {
    return attachments || [];
  }

  const p = prompt.toLowerCase();

  const scored = attachments.map((att) => {
    let score = 0;
    const name = (att.name || '').toLowerCase();
    const path = (att.path || '').toLowerCase();

    // Priority entry points
    if (name.includes('package.json') || name.includes('index.html') || name.includes('app.tsx') || name.includes('page.tsx')) {
      score += 15;
    }
    if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.py') || name.endsWith('.js')) {
      score += 5;
    }
    // Matching words in user prompt
    const parts = name.split(/[^a-z0-9]/).filter((w) => w.length > 2);
    for (const word of parts) {
      if (p.includes(word)) {
        score += 10;
      }
    }

    return { att, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxFiles).map((s) => s.att);
}
