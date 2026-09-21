import { NextRequest, NextResponse } from 'next/server';
import { deleteUserConnection } from '@/lib/user-connections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider, userId = 'usr_nepal_builder_001' } = body;

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
