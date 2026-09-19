import { NextRequest, NextResponse } from 'next/server';
import { executeGitHubAction } from '@/lib/integrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'create_pull_request', ...params } = body;

    const result = await executeGitHubAction(action, params);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute GitHub action',
      },
      { status: 500 }
    );
  }
}
