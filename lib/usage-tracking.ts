import { createAdminClient, isAdminConfigured } from '@/lib/supabase/admin';

export interface TokenUsageParams {
  userId: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  costCredits?: number;
  mode?: string;
}

export interface PlanLimitCheckResult {
  allowed: boolean;
  error?: 'plan_limit_exceeded' | 'concurrent_session_limit_exceeded' | 'auth_required';
  message?: string;
  planTier: string;
  monthlyLimit: number;
  usedTokens: number;
  activeSessions: number;
  maxSessions: number;
}

/**
 * Record model token usage for an authenticated user in token_usage_log table.
 */
export async function recordTokenUsage(params: TokenUsageParams): Promise<void> {
  if (!isAdminConfigured() || !params.userId) {
    return;
  }

  try {
    const admin = createAdminClient();
    const totalTokens = params.totalTokens ?? (params.promptTokens + params.completionTokens);

    const { error } = await admin.from('token_usage_log').insert({
      user_id: params.userId,
      model_id: params.modelId || 'default',
      prompt_tokens: Math.max(0, Math.round(params.promptTokens)),
      completion_tokens: Math.max(0, Math.round(params.completionTokens)),
      total_tokens: Math.max(0, Math.round(totalTokens)),
      credits_charged: Math.max(0, Math.round(params.costCredits ?? 1)),
      mode: params.mode || 'developer',
    });

    if (error) {
      console.error('[UsageTracking] Failed to record token usage in token_usage_log:', error.message);
    }
  } catch (err) {
    console.error('[UsageTracking] Unexpected error logging token usage:', err);
  }
}

/**
 * Check a user's subscription plan tier, monthly token limit, and active sessions.
 */
export async function checkPlanLimits(userId: string): Promise<PlanLimitCheckResult> {
  const fallbackResult: PlanLimitCheckResult = {
    allowed: true,
    planTier: 'lite',
    monthlyLimit: 500000,
    usedTokens: 0,
    activeSessions: 1,
    maxSessions: 2,
  };

  if (!isAdminConfigured() || !userId) {
    return fallbackResult;
  }

  try {
    const admin = createAdminClient();

    // 1. Fetch user profile plan_tier
    const { data: profile } = await admin
      .from('profiles')
      .select('plan_tier')
      .eq('id', userId)
      .maybeSingle();

    const planTier = profile?.plan_tier || 'lite';

    // 2. Fetch subscription plan config
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('monthly_token_limit, max_concurrent_sessions')
      .eq('tier', planTier)
      .maybeSingle();

    const monthlyLimit = Number(plan?.monthly_token_limit) || 500000;
    const maxSessions = Number(plan?.max_concurrent_sessions) || 2;

    // 3. Calculate this month's token usage
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const { data: usageRows, error: usageError } = await admin
      .from('token_usage_log')
      .select('total_tokens')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);

    if (usageError) {
      console.warn('[UsageTracking] Could not query token_usage_log:', usageError.message);
    }

    const usedTokens = (usageRows || []).reduce(
      (sum, row) => sum + (Number(row.total_tokens) || 0),
      0
    );

    // 4. Calculate active concurrent sessions (within last 15 minutes)
    const activeThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: activeSessionCount } = await admin
      .from('active_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('last_active', activeThreshold);

    const activeSessions = activeSessionCount ?? 1;

    // 5. Enforce monthly token limit
    if (usedTokens >= monthlyLimit) {
      return {
        allowed: false,
        error: 'plan_limit_exceeded',
        message: `You have reached your monthly limit of ${monthlyLimit.toLocaleString()} tokens for the ${planTier.toUpperCase()} plan (used: ${usedTokens.toLocaleString()} tokens this month). Please upgrade your subscription tier in Settings to continue.`,
        planTier,
        monthlyLimit,
        usedTokens,
        activeSessions,
        maxSessions,
      };
    }

    // 6. Enforce concurrent session limit
    if (activeSessions > maxSessions) {
      return {
        allowed: false,
        error: 'concurrent_session_limit_exceeded',
        message: `Your ${planTier.toUpperCase()} plan allows a maximum of ${maxSessions} concurrent session(s). You currently have ${activeSessions} active sessions. Please close other browser windows or tabs.`,
        planTier,
        monthlyLimit,
        usedTokens,
        activeSessions,
        maxSessions,
      };
    }

    return {
      allowed: true,
      planTier,
      monthlyLimit,
      usedTokens,
      activeSessions,
      maxSessions,
    };
  } catch (err) {
    console.error('[UsageTracking] Error checking plan limits:', err);
    return fallbackResult;
  }
}

/**
 * Touch or insert an active session record for the user.
 */
export async function touchActiveSession(
  userId: string,
  sessionToken?: string,
  device?: string
): Promise<void> {
  if (!isAdminConfigured() || !userId) return;

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (sessionToken) {
      const { data: existing } = await admin
        .from('active_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_token', sessionToken)
        .maybeSingle();

      if (existing) {
        await admin
          .from('active_sessions')
          .update({ last_active: now })
          .eq('id', existing.id);
        return;
      }
    }

    await admin.from('active_sessions').insert({
      user_id: userId,
      session_token: sessionToken || null,
      device: device || 'Web Browser',
      last_active: now,
      is_current: true,
    });
  } catch (err) {
    console.error('[UsageTracking] Failed to touch active session:', err);
  }
}
