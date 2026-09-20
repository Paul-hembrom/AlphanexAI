/**
 * Stage 1: Autonomous Software Architecture Planner
 *
 * Fast LLM call using a lightweight, rapid model to analyze user prompt
 * and target stack, producing an explicit PlanManifest.
 *
 * Fallback: If planner throws or returns malformed JSON, falls back cleanly
 * to a single-file manifest using heuristic fallback without breaking the build.
 */

import { BuildStack } from '../types';
import { callOpenRouterCompletion } from '../openrouter';

export interface PlannedFile {
  path: string;
  purpose: string;
  needs3D: boolean;
}

export interface PlanManifest {
  files: PlannedFile[];
  reasoning: string;
}

export interface PlanOptions {
  prompt: string;
  stack: BuildStack;
  apiKey?: string | null;
  plannerModel?: string;
  is3DFallback?: boolean;
}

export async function planApplication(options: PlanOptions): Promise<PlanManifest> {
  const { prompt, stack, apiKey, plannerModel = 'qwen-3-8-flash', is3DFallback = false } = options;

  const defaultFileName =
    stack === 'react'
      ? 'App.tsx'
      : stack === 'nextjs'
      ? 'page.tsx'
      : stack === 'vue'
      ? 'App.vue'
      : stack === 'flutter'
      ? 'main.dart'
      : 'index.html';

  const systemInstruction = `You are an expert Software Architecture Planner at Alphanex AI.
Analyze the user's web app creation request and target stack: "${stack}".
Determine the exact set of files needed for a complete, production-grade implementation.

STRICT REQUIREMENTS:
1. Output MUST be ONLY valid JSON matching this schema:
{
  "files": [
    {
      "path": "index.html",
      "purpose": "Home page with hero section and main interactive tool",
      "needs3D": false
    }
  ],
  "reasoning": "One sentence explaining why this page set was chosen."
}
2. For stack !== 'html-css-js' (e.g. 'react', 'nextjs', 'vue', 'flutter', 'react-native'):
   Provide a single entry with the primary component file ('${defaultFileName}').
3. For stack === 'html-css-js':
   - If the user explicitly asks for a multi-page site or application, or if the domain naturally calls for multiple pages (e.g., store with product catalog and checkout, company with about and contact, portal with dashboard and settings), plan 2 to 5 clean HTML pages (e.g., index.html, about.html, contact.html). Always include index.html as the primary entry point.
   - If the user prompt is for a focused single-page utility, calculator, game, or landing page, plan only "index.html".
   - Set "needs3D": true ONLY if that specific page requires 3D elements, Three.js, WebGL, 3D models, or 3D animations. Set "needs3D": false for standard 2D pages.
4. Output RAW JSON ONLY. Do NOT wrap in markdown code fences or backticks.`;

  try {
    const response = await callOpenRouterCompletion({
      apiKey,
      modelId: plannerModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `User Prompt: ${prompt}\nTarget Stack: ${stack}` },
      ],
      temperature: 0.1,
      maxTokens: 1024,
    });

    // Clean JSON response (strip markdown fences if model returned them)
    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);

    if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
      const validFiles: PlannedFile[] = parsed.files.map((f: { path?: string; purpose?: string; needs3D?: boolean }, idx: number) => {
        let filePath = typeof f.path === 'string' && f.path.trim() ? f.path.trim() : `page-${idx + 1}.html`;
        if (stack === 'html-css-js' && !filePath.endsWith('.html')) {
          filePath = `${filePath}.html`;
        }
        return {
          path: filePath,
          purpose: typeof f.purpose === 'string' ? f.purpose : 'Application page',
          needs3D: Boolean(f.needs3D),
        };
      });

      // Ensure index.html exists for html-css-js or primary filename exists for other stacks
      if (stack === 'html-css-js' && !validFiles.some((f) => f.path === 'index.html')) {
        validFiles[0].path = 'index.html';
      } else if (stack !== 'html-css-js' && !validFiles.some((f) => f.path === defaultFileName)) {
        validFiles[0].path = defaultFileName;
      }

      return {
        files: validFiles,
        reasoning:
          typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
            ? parsed.reasoning.trim()
            : `Selected ${validFiles.length} file(s) for ${stack} implementation.`,
      };
    }
  } catch (err) {
    console.warn('Planner skipped or failed, using fallback single-file manifest:', err);
  }

  // Fallback heuristic plan (Ground Rule: Never break the whole build if planner fails)
  return {
    files: [
      {
        path: defaultFileName,
        purpose: prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt,
        needs3D: is3DFallback,
      },
    ],
    reasoning: 'Single-file architecture planned via fallback heuristic.',
  };
}
