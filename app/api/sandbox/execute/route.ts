import { NextRequest, NextResponse } from 'next/server';
import { runJsInSandbox } from '@/lib/vercel-sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, timeoutMs } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code string is required' }, { status: 400 });
    }

    const result = await runJsInSandbox(code, timeoutMs ?? 30_000);
    return NextResponse.json({
      status: 'ok',
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
