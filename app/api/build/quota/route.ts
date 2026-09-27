import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient, isAdminConfigured } from '@/lib/supabase/admin';
import { getBuildQuota } from '@/lib/build-quota';
import { PlanTier } from '@/lib/types';
import { resolvePlanTier } from '@/lib/plan-allowance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  let planTier: PlanTier = 'lite';

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch {}
  }

  if (!userId) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ') && isAdminConfigured()) {
      try {
        const admin = createAdminClient();
        const token = authHeader.substring(7);
        const { data: { user } } = await admin.auth.getUser(token);
        if (user) userId = user.id;
      } catch {}
    }
  }

  if (userId && isAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data: prof } = await admin
        .from('profiles')
        .select('plan_tier')
        .eq('id', userId)
        .maybeSingle();
      if (prof?.plan_tier) {
        planTier = resolvePlanTier(prof.plan_tier);
      }
    } catch {}
  }

  const quota = await getBuildQuota(userId || 'guest', planTier);
  return NextResponse.json(quota);
}
