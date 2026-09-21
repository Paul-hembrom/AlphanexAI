import { NextRequest, NextResponse } from 'next/server';
import { getUserConnectionsStatus } from '@/lib/user-connections';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let userId = req.nextUrl.searchParams.get('userId');

    if (!userId && isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({
        success: true,
        userId: null,
        connections: {
          github: { connected: false, accountUsername: null, scopes: [], connectedAt: null },
          google: { connected: false, accountUsername: null, scopes: [], connectedAt: null },
        },
      });
    }

    const status = await getUserConnectionsStatus(userId);
    return NextResponse.json({ success: true, userId, connections: status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve connection status' },
      { status: 500 }
    );
  }
}
