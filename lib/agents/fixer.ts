/**
 * Stage 4: Manifest-Aware Auto-Repair Fixer
 *
 * Extends the sandbox repair loop with manifest awareness:
 * When repairing file X, includes not just X's own code and stderr, but
 * key shared elements from sibling files (such as index.html's navigation/header
 * and global links) to prevent repairs from breaking cross-page consistency.
 *
 * Capped at 3 iterations, flat context per attempt, real sandbox error feedback.
 */

import { BuildStack, UserProfileSettings } from '../types';
import { BuiltFile, extractNavOrHeader } from './builder';
import { PlanManifest } from './planner';
import { callOpenRouterCompletion } from '../openrouter';
import { runBuildCheckInSandbox, BuildCheckResult } from '../vercel-sandbox';
import { extractCodeFromMarkdown, ensureCompleteHtml } from '../webapp-shared';

export interface FixerOptions {
  file: BuiltFile;
  siblingFiles: BuiltFile[];
  manifest: PlanManifest;
  userPrompt: string;
  stack: BuildStack;
  apiKey?: string | null;
  modelId: string;
  settings?: UserProfileSettings;
  maxIterations?: number;
  reportProgress: (
    step: 'planned' | 'generating' | 'checking' | 'repairing' | 'done',
    file: string,
    message: string
  ) => void;
  initialCheckResult: BuildCheckResult;
}

export interface FixResult {
  finalCode: string;
  passed: boolean;
  repairIterations: number;
  checksRun: number;
  checksPassed: number;
  verificationLog: string[];
  stderr: string;
}

function extractCleanCode(response: string, targetStack: BuildStack): string {
  if (targetStack === 'html-css-js') {
    const extracted = extractCodeFromMarkdown(response);
    return extracted ? ensureCompleteHtml(extracted) : ensureCompleteHtml(response);
  }
  const codeBlockRegex = /```(?:tsx|jsx|typescript|javascript|vue|dart)?\s*([\s\S]*?)```/i;
  const match = response.match(codeBlockRegex);
  return match && match[1] ? match[1].trim() : response.trim();
}

export async function repairFileWithContext(options: FixerOptions): Promise<FixResult> {
  const {
    file,
    siblingFiles,
    manifest,
    userPrompt,
    stack,
    apiKey,
    modelId,
    settings,
    maxIterations = 3,
    reportProgress,
    initialCheckResult,
  } = options;

  let currentCode = file.content;
  let currentCheck = initialCheckResult;
  let iterations = 0;
  const verificationLog: string[] = [...initialCheckResult.verificationLog];
  let checksRun = initialCheckResult.checksRun;
  let checksPassed = initialCheckResult.checksPassed;

  // Extract shared elements from sibling files
  const indexSibling = siblingFiles.find((s) => s.path === 'index.html');
  const sharedNav = indexSibling ? extractNavOrHeader(indexSibling.content) : null;

  const sharedConsistencyBlock = [
    `Project Manifest: ${manifest.files.map((f) => f.path).join(', ')}`,
    sharedNav
      ? `Shared Header/Nav (Preserve consistency with index.html):\n\`\`\`html\n${sharedNav}\n\`\`\``
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const systemPrompt = `You are a Principal Software Architect and Application Engineer at Alphanex AI.
Fix the syntax, structure, or compilation error in the specified file while strictly preserving consistency with the rest of the project.
Target Stack: ${stack}
Target File: ${file.path}
`;

  while (!currentCheck.passed && iterations < maxIterations) {
    iterations++;

    const errorDetails =
      currentCheck.stderr ||
      currentCheck.verificationLog.filter((l) => l.startsWith('✗')).join('\n') ||
      `Verification error detected in ${file.path}`;

    reportProgress(
      'repairing',
      file.path,
      `Repair iteration #${iterations}/${maxIterations}: Fixing ${file.path} (${errorDetails.slice(0, 70)})...`
    );

    // Flat context: system prompt, original user prompt, previous code, and error + shared context
    const repairMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: `\`\`\`html\n${currentCode}\n\`\`\`` },
      {
        role: 'user',
        content: `The file "${file.path}" failed sandbox compilation with this error:\n\`\`\`\n${errorDetails}\n\`\`\`\n\n${sharedConsistencyBlock}\n\nPlease fix this error for "${file.path}" and return the complete, corrected code inside a single markdown code block. Do NOT truncate or leave placeholders.`,
      },
    ];

    try {
      const repairResponse = await callOpenRouterCompletion({
        apiKey,
        modelId,
        messages: repairMessages,
        temperature: 0.1,
        maxTokens: 8192,
      });

      currentCode = extractCleanCode(repairResponse, stack);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      verificationLog.push(`✗ Repair API Error on ${file.path}: ${msg}`);
      break;
    }

    reportProgress(
      'checking',
      file.path,
      `Verifying repaired ${file.path} in sandbox (iteration ${iterations}/${maxIterations})...`
    );

    currentCheck = await runBuildCheckInSandbox(
      [{ path: file.path, content: currentCode }],
      stack,
      settings
    );

    checksRun += currentCheck.checksRun;
    checksPassed += currentCheck.checksPassed;
    verificationLog.push(...currentCheck.verificationLog);

    if (currentCheck.passed) {
      reportProgress('checking', file.path, `✓ Sandbox check passed for ${file.path}`);
      reportProgress('done', file.path, `✓ ${file.path} verified and ready`);
      break;
    } else {
      reportProgress(
        'checking',
        file.path,
        `⚠️ Check still failing on ${file.path} (iteration ${iterations}/${maxIterations})`
      );
    }
  }

  return {
    finalCode: currentCode,
    passed: currentCheck.passed,
    repairIterations: iterations,
    checksRun,
    checksPassed,
    verificationLog,
    stderr: currentCheck.stderr,
  };
}
