import { NextRequest, NextResponse } from 'next/server';
import { executeGoogleDocsAction } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'create_brief', ...params } = body;

    const result = await executeGoogleDocsAction(action, params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute Google Docs action',
      },
      { status: 500 }
    );
  }
}
