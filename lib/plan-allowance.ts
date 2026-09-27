/**
 * Unified Plan Entitlement and Model Access Engine
 *
 * Implements strict non-bypassable subscription mapping:
 * - plan_tier 'lite'  = Free Tier        → Free models only (Credits do NOT unlock paid models)
 * - plan_tier 'mid'   = Plus             → Free + Lite + Plus models; Build Mode active
 * - plan_tier 'upper' = Pro / Pro Builder → All models (Claude Opus, Sonnet, Astra)
 *
 * Credits never bypass subscription on Free Tier.
 */

import { ModelTier, PlanTier } from './types';

/**
 * Resolves a normalized PlanTier from database profile or wallet plan name.
 */
export function resolvePlanTier(
  source?:
    | { planTier?: string; plan_tier?: string; plan?: string }
    | string
    | null
): PlanTier {
  if (!source) return 'lite';

  if (typeof source === 'object') {
    const raw = source.planTier || source.plan_tier || source.plan;
    return resolvePlanTier(raw);
  }

  const str = String(source).trim().toLowerCase();
  if (
    str === 'upper' ||
    str.includes('pro builder') ||
    str === 'pro' ||
    str === 'max'
  ) {
    return 'upper';
  }
  if (
    str === 'mid' ||
    str === 'plus' ||
    str === 'starter'
  ) {
    return 'mid';
  }
  return 'lite';
}

/**
 * Maps plan_tier onto user-facing plan badge label.
 */
export function getPlanDisplayName(
  tierOrSource?: string | null
): 'Pro Builder' | 'Plus' | 'Free Tier' {
  const tier = resolvePlanTier(tierOrSource);
  switch (tier) {
    case 'upper':
      return 'Pro Builder';
    case 'mid':
      return 'Plus';
    case 'lite':
    default:
      return 'Free Tier';
  }
}

export interface ModelAccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPlan?: 'Plus' | 'Pro Builder';
  suggestedAction?: 'upgrade_plus' | 'upgrade_pro';
}

/**
 * Validates whether the user's subscription tier entitles them to call or select a model.
 * Rule: Credits NEVER unlock paid models on Free Tier (lite).
 */
export function canUseModel(params: {
  planTier: PlanTier;
  modelTier: ModelTier;
  credits?: number;
}): ModelAccessCheckResult {
  const { planTier, modelTier } = params;

  // 1. FREE TIER (lite): Only models with modelTier === 'free' are selectable/callable
  if (planTier === 'lite') {
    if (modelTier === 'free') {
      return { allowed: true };
    }
    const isPro = modelTier === 'pro' || modelTier === 'max' || modelTier === 'vault' || modelTier === 'pro_max';
    return {
      allowed: false,
      reason: isPro
        ? 'Free Tier accounts cannot access Pro or Frontier models. Upgrade to Pro Builder to unlock.'
        : 'Free Tier accounts cannot access Plus/Lite models. Upgrade to Plus to unlock.',
      requiredPlan: isPro ? 'Pro Builder' : 'Plus',
      suggestedAction: isPro ? 'upgrade_pro' : 'upgrade_plus',
    };
  }

  // 2. PLUS TIER (mid): Plus, Lite, and Free models allowed in general workspace chat
  if (planTier === 'mid') {
    if (modelTier === 'free' || modelTier === 'lite' || modelTier === 'plus') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Plus subscription includes Free, Lite, and Plus models. Upgrade to Pro Builder for Claude Opus, Sonnet, and Frontier models.',
      requiredPlan: 'Pro Builder',
      suggestedAction: 'upgrade_pro',
    };
  }

  // 3. PRO BUILDER TIER (upper): All models accessible
  if (planTier === 'upper') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Subscription upgrade required.',
    requiredPlan: 'Plus',
    suggestedAction: 'upgrade_plus',
  };
}
