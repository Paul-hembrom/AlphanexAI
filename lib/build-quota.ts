/**
 * Daily Quotas Engine (Claude-style, Nepal Midnight UTC+05:45)
 *
 * Daily Limits per UTC+05:45 calendar day:
 * - lite:  Build Mode: 0 (Upgrade required)
 *          Free Chat: 30 completions/day (developer + researcher + general)
 * - mid:   Generate: 20, Review/Repair: 8, Polish: 1
 * - upper: Generate: 50, Review/Repair: 20, Polish: 3
 */

import { BuildStage, PlanTier } from './types';
import { createAdminClient, isAdminConfigured } from './supabase/admin';

// Nepal Time Offset: UTC+05:45 (20,700,000 milliseconds)
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

export interface DailyStageLimits {
  generate: number;
  reviewRepair: number;
  polish: number;
}

export const PLAN_BUILD_LIMITS: Record<PlanTier, DailyStageLimits> = {
  lite: {
    generate: 0,
    reviewRepair: 0,
    polish: 0,
  },
  mid: {
    generate: 20,
    reviewRepair: 8,
    polish: 1,
  },
  upper: {
    generate: 50,
    reviewRepair: 20,
    polish: 3,
  },
};

export const LITE_DAILY_CHAT_LIMIT = 30;

/**
 * Returns the start of the current Nepal calendar day and the next Nepal midnight in UTC.
 */
export function getNepalCalendarDayBounds(now = new Date()): {
  startOfNepalDayIso: string;
  nextNepalMidnightIso: string;
  resetsAtFormatted: string;
} {
  const nepalNow = new Date(now.getTime() + NEPAL_OFFSET_MS);
  const y = nepalNow.getUTCFullYear();
  const m = nepalNow.getUTCMonth();
  const d = nepalNow.getUTCDate();

  const startUtcMs = Date.UTC(y, m, d) - NEPAL_OFFSET_MS;
  const nextMidnightUtcMs = Date.UTC(y, m, d + 1) - NEPAL_OFFSET_MS;

  const nextMidnight = new Date(nextMidnightUtcMs);

  return {
    startOfNepalDayIso: new Date(startUtcMs).toISOString(),
    nextNepalMidnightIso: nextMidnight.toISOString(),
    resetsAtFormatted: nextMidnight.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' NPT (midnight)',
  };
}

export interface BuildQuotaStatus {
  allowed: boolean;
  error?: 'upgrade_required' | 'quota_exceeded';
  message?: string;
  planTier: PlanTier;
  resetsAt: string;
  quotas: {
    generate: { limit: number; used: number; remaining: number };
    reviewRepair: { limit: number; used: number; remaining: number };
    polish: { limit: number; used: number; remaining: number };
  };
}

/**
 * Fetches the current user's daily build quotas and usage.
 */
export async function getBuildQuota(
  userId: string,
  planTier: PlanTier
): Promise<BuildQuotaStatus> {
  const { startOfNepalDayIso, nextNepalMidnightIso, resetsAtFormatted } = getNepalCalendarDayBounds();
  const limits = PLAN_BUILD_LIMITS[planTier] || PLAN_BUILD_LIMITS.lite;

  const usageCounts = {
    generate: 0,
    reviewRepair: 0,
    polish: 0,
  };

  if (isAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data: logs, error } = await admin
        .from('build_pass_log')
        .select('stage')
        .eq('user_id', userId)
        .gte('created_at', startOfNepalDayIso)
        .lt('created_at', nextNepalMidnightIso);

      if (!error && Array.isArray(logs)) {
        for (const log of logs) {
          const s = log.stage as BuildStage;
          if (s === 'generate' || s === 'plan' || s === 'ingest') {
            usageCounts.generate += 1;
          } else if (s === 'test' || s === 'repair') {
            usageCounts.reviewRepair += 1;
          } else if (s === 'polish') {
            usageCounts.polish += 1;
          }
        }
      }
    } catch (err) {
      console.warn('[getBuildQuota] Error fetching build_pass_log:', err);
    }
  }

  const quotas = {
    generate: {
      limit: limits.generate,
      used: usageCounts.generate,
      remaining: Math.max(0, limits.generate - usageCounts.generate),
    },
    reviewRepair: {
      limit: limits.reviewRepair,
      used: usageCounts.reviewRepair,
      remaining: Math.max(0, limits.reviewRepair - usageCounts.reviewRepair),
    },
    polish: {
      limit: limits.polish,
      used: usageCounts.polish,
      remaining: Math.max(0, limits.polish - usageCounts.polish),
    },
  };

  if (planTier === 'lite') {
    return {
      allowed: false,
      error: 'upgrade_required',
      message: 'Build Mode requires an active Plus or Pro Builder subscription. Upgrade to start autonomous app builds.',
      planTier,
      resetsAt: resetsAtFormatted,
      quotas,
    };
  }

  return {
    allowed: true,
    planTier,
    resetsAt: resetsAtFormatted,
    quotas,
  };
}

/**
 * Checks if a specific build stage pass is permitted under the daily quota.
 */
export async function checkBuildPass(
  userId: string,
  planTier: PlanTier,
  stage: BuildStage
): Promise<{ allowed: boolean; error?: string; message?: string; resetsAt?: string }> {
  const status = await getBuildQuota(userId, planTier);

  if (!status.allowed) {
    return {
      allowed: false,
      error: status.error,
      message: status.message,
      resetsAt: status.resetsAt,
    };
  }

  let remaining = 0;
  let stageLabel = 'Generate';

  if (stage === 'generate' || stage === 'plan' || stage === 'ingest') {
    remaining = status.quotas.generate.remaining;
    stageLabel = 'Generate';
  } else if (stage === 'test' || stage === 'repair') {
    remaining = status.quotas.reviewRepair.remaining;
    stageLabel = 'Review & Repair';
  } else if (stage === 'polish') {
    remaining = status.quotas.polish.remaining;
    stageLabel = 'Final Polish';
  }

  if (remaining <= 0) {
    return {
      allowed: false,
      error: 'quota_exceeded',
      message: `Daily ${stageLabel} pass quota reached (${status.quotas[stage === 'polish' ? 'polish' : stage === 'test' || stage === 'repair' ? 'reviewRepair' : 'generate'].limit} per day). Quotas reset at midnight Nepal time (${status.resetsAt}).`,
      resetsAt: status.resetsAt,
    };
  }

  return { allowed: true, resetsAt: status.resetsAt };
}

/**
 * Consumes a build pass by inserting a record into build_pass_log.
 */
export async function consumeBuildPass(
  userId: string,
  stage: BuildStage,
  modelId: string
): Promise<boolean> {
  if (!isAdminConfigured()) return true;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('build_pass_log').insert({
      user_id: userId,
      stage,
      model_id: modelId,
    });

    if (error) {
      console.warn('[consumeBuildPass] Insert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[consumeBuildPass] Failed to record:', err);
    return false;
  }
}

/**
 * Checks free chat daily completion quota for Lite tier (30 completions/day).
 */
export async function checkFreeChatDailyQuota(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  message?: string;
  resetsAt: string;
}> {
  const { startOfNepalDayIso, nextNepalMidnightIso, resetsAtFormatted } = getNepalCalendarDayBounds();
  const limit = LITE_DAILY_CHAT_LIMIT;

  if (!isAdminConfigured()) {
    return { allowed: true, used: 0, limit, resetsAt: resetsAtFormatted };
  }

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('token_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfNepalDayIso)
      .lt('created_at', nextNepalMidnightIso);

    const used = typeof count === 'number' ? count : 0;

    if (used >= limit) {
      return {
        allowed: false,
        used,
        limit,
        resetsAt: resetsAtFormatted,
        message: `Free Tier daily limit of ${limit} completions reached for today. Quotas reset at midnight Nepal time (${resetsAtFormatted}). Upgrade to Plus or Pro Builder for high-capacity reasoning.`,
      };
    }

    return { allowed: true, used, limit, resetsAt: resetsAtFormatted };
  } catch (err) {
    console.warn('[checkFreeChatDailyQuota] Error checking free chat count:', err);
    return { allowed: true, used: 0, limit, resetsAt: resetsAtFormatted };
  }
}
