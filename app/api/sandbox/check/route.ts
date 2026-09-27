import { NextRequest, NextResponse } from 'next/server';
import { runBuildCheckInSandbox } from '@/lib/vercel-sandbox';
import { BuildStack, UserProfileSettings } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appName, files, stack = 'html-css-js', settings } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        {
          passed: false,
          exitCode: 1,
          stdout: '',
          stderr: 'No files provided for sandbox compilation check.',
          checksRun: 0,
          checksPassed: 0,
          verificationLog: ['✗ Build Check: No files found to verify.'],
        },
        { status: 400 }
      );
    }

    const checkResult = await runBuildCheckInSandbox(
      files,
      stack as BuildStack,
      settings as UserProfileSettings | undefined
    );

    return NextResponse.json({
      appName: appName || 'webapp',
      passed: checkResult.passed,
      exitCode: checkResult.exitCode,
      stdout: checkResult.stdout,
      stderr: checkResult.stderr,
      checksRun: checkResult.checksRun,
      checksPassed: checkResult.checksPassed,
      verificationLog: checkResult.verificationLog,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        passed: false,
        exitCode: 1,
        stdout: '',
        stderr: error?.message || 'Sandbox check failed',
        checksRun: 0,
        checksPassed: 0,
        verificationLog: [`✗ Exception during sandbox verification: ${error?.message || String(error)}`],
      },
      { status: 500 }
    );
  }
}
