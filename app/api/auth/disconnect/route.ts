import { NextRequest, NextResponse } from 'next/server';
import { deleteUserConnection } from '@/lib/user-connections';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { provider, userId } = body;

    if (!userId && isSupabaseServerConfigured()) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    if (!provider || (provider !== 'github' && provider !== 'google')) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider specified. Must be github or google.' },
        { status: 400 }
      );
    }

    await deleteUserConnection(userId, provider);
    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${provider} for user ${userId}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to disconnect provider' },
      { status: 500 }
    );
  }
}
