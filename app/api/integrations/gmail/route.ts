import { NextRequest, NextResponse } from 'next/server';
import { executeGmailAction } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action = 'list_threads',
      userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId') || 'usr_nepal_builder_001',
      ...params
    } = body;

    const result = await executeGmailAction(action, params, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute Gmail action',
      },
      { status: 500 }
    );
  }
}
