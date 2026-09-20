/**
 * Stage 2: Autonomous Application File Builder
 *
 * Loops over the PlanManifest and makes ONE generation call per file.
 * Each file receives its own full maxTokens budget (8192), eliminating
 * token starvation.
 *
 * Maintains site-wide consistency by injecting shared project manifest context
 * and reusing index.html's actual <header>/<nav> markup for all subsequent pages.
 */

import { BuildStack } from '../types';
import { PlanManifest, PlannedFile } from './planner';
import { callOpenRouterCompletion } from '../openrouter';
import { extractCodeFromMarkdown, ensureCompleteHtml } from '../webapp-shared';

export interface BuiltFile {
  path: string;
  content: string;
  purpose: string;
  needs3D: boolean;
}

export interface BuilderOptions {
  manifest: PlanManifest;
  userPrompt: string;
  stack: BuildStack;
  apiKey?: string | null;
  modelId: string;
  temperature?: number;
  reportProgress: (
    step: 'planned' | 'generating' | 'checking' | 'repairing' | 'done',
    file: string,
    message: string
  ) => void;
}

/**
 * Extracts <header> or <nav> elements from HTML code for page consistency
 */
export function extractNavOrHeader(html: string): string | null {
  if (!html) return null;
  const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
  if (headerMatch && headerMatch[0] && headerMatch[0].length > 20) {
    return headerMatch[0].trim();
  }
  const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
  if (navMatch && navMatch[0] && navMatch[0].length > 20) {
    return navMatch[0].trim();
  }
  return null;
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

function buildFilePrompt(
  file: PlannedFile,
  fileIndex: number,
  manifest: PlanManifest,
  userPrompt: string,
  stack: BuildStack,
  sharedNav: string | null
): { systemPrompt: string; userMessage: string } {
  let stackRules = '';

  if (stack === 'html-css-js') {
    stackRules = `You MUST provide a complete, self-contained, fully working HTML document for "${file.path}".
- Start with <!DOCTYPE html>.
- Include <head> with Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script> and modern typography.
- Implement responsive, polished semantic markup with accessible styling.
- Provide full, working Vanilla JavaScript inside a <script> tag for every interactive feature on this page.
- NEVER use pseudo-code, empty handler stubs, or TODO comments. Write real, executable JS with zero syntax errors.
- Wrap the entire code in a single markdown code block: \`\`\`html ... \`\`\`.`;

    if (file.needs3D) {
      stackRules += `\n\n3D & Interactive WebGL Requirements for this file:
- Include Three.js from CDN: <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
- Set up a clean THREE.Scene, THREE.PerspectiveCamera, and THREE.WebGLRenderer attached to a dedicated <canvas> or full-bleed container.
- Implement a complete requestAnimationFrame render loop with interactive features (such as mouse/touch movement, auto-rotation, or controls).
- Ensure the renderer and camera update dynamically on window resize (renderer.setSize, camera.aspect, camera.updateProjectionMatrix).
- Add clean lighting (AmbientLight, DirectionalLight) and appropriate geometry/materials.`;
    }
  } else if (stack === 'react' || stack === 'nextjs') {
    stackRules = `You MUST provide a complete, self-contained, working React application/component using Tailwind CSS.
- Include all necessary React hooks (useState, useEffect, useMemo, etc.).
- Provide full UI interactions with clean functional components.
- Wrap the entire code in a single markdown code block: \`\`\`tsx ... \`\`\`.`;
  } else if (stack === 'vue') {
    stackRules = `You MUST provide a complete Vue 3 Single File Component.
- Include <template>, <script setup>, and <style> sections.
- Use Tailwind CSS utility classes for styling.
- Wrap the entire code in a single markdown code block: \`\`\`vue ... \`\`\`.`;
  } else if (stack === 'react-native') {
    stackRules = `You MUST provide a complete React Native / Expo screen component in TypeScript.
- Import components from 'react-native'.
- Wrap the entire code in a single markdown code block: \`\`\`tsx ... \`\`\`.`;
  } else if (stack === 'flutter') {
    stackRules = `You MUST provide a complete Flutter application in Dart.
- Include import 'package:flutter/material.dart';
- Include void main() => runApp(...) and a complete StatefulWidget or StatelessWidget.
- Wrap the entire code in a single markdown code block: \`\`\`dart ... \`\`\`.`;
  }

  const systemPrompt = `You are a Principal Software Architect and Application Engineer at Alphanex AI.
Build a complete, production-ready file based on the project manifest.
Target Stack: ${stack}
Target File: ${file.path}

${stackRules}

Design Requirements:
- Use clean modern design tokens, high contrast, balanced whitespace, and purposeful layout.
- Include complete business logic for the requested domain.
- Provide a brief 2-3 sentence overview at the beginning, followed by the complete code block.`;

  let sharedContext = `Project Manifest:\n${manifest.files
    .map((f) => `- ${f.path}: ${f.purpose} (3D: ${f.needs3D ? 'yes' : 'no'})`)
    .join('\n')}\nPlanning Rationale: ${manifest.reasoning}`;

  if (fileIndex > 0 && sharedNav) {
    sharedContext += `\n\nShared Site Navigation (You MUST reuse this exact navigation/header markup from index.html so brand identity and site-wide links are identical across all pages):\n\`\`\`html\n${sharedNav}\n\`\`\``;
  }

  const userMessage = `User Application Prompt: "${userPrompt}"

${sharedContext}

Now generate the complete, self-contained implementation for "${file.path}".
Purpose: ${file.purpose}
${file.needs3D ? 'Note: This specific page requires an interactive 3D / WebGL scene.' : ''}
Provide full, unabbreviated code.`;

  return { systemPrompt, userMessage };
}

/**
 * Builds each planned file with an individual LLM call and token budget
 */
export async function buildFilesFromManifest(options: BuilderOptions): Promise<BuiltFile[]> {
  const { manifest, userPrompt, stack, apiKey, modelId, temperature = 0.2, reportProgress } = options;

  const builtFiles: BuiltFile[] = [];
  let indexNavHeader: string | null = null;

  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];

    reportProgress('generating', file.path, `⏳ Generating ${file.path} (${file.purpose})...`);

    const { systemPrompt, userMessage } = buildFilePrompt(
      file,
      i,
      manifest,
      userPrompt,
      stack,
      indexNavHeader
    );

    try {
      const response = await callOpenRouterCompletion({
        apiKey,
        modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        maxTokens: 8192,
      });

      const cleanCode = extractCleanCode(response, stack);

      // If this is index.html, capture its <header> / <nav> markup for subsequent pages
      if (file.path === 'index.html' || i === 0) {
        indexNavHeader = extractNavOrHeader(cleanCode);
      }

      reportProgress(
        'generating',
        file.path,
        `✓ ${file.path} generated (${(cleanCode.length / 1024).toFixed(1)}kb)`
      );

      builtFiles.push({
        path: file.path,
        content: cleanCode,
        purpose: file.purpose,
        needs3D: file.needs3D,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      reportProgress('generating', file.path, `✗ Generation error on ${file.path}: ${msg}`);
      throw err;
    }
  }

  return builtFiles;
}
