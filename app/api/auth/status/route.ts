import { NextRequest, NextResponse } from 'next/server';
import { getUserConnectionsStatus } from '@/lib/user-connections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || 'usr_nepal_builder_001';
    const status = await getUserConnectionsStatus(userId);
    return NextResponse.json({ success: true, userId, connections: status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve connection status' },
      { status: 500 }
    );
  }
}
