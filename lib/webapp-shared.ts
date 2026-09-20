/**
 * Shared pure string and utility helpers for Web App Studio
 *
 * Safe for both Server (Node/Next.js route handlers) and Client execution.
 * Contains NO window or localStorage dependencies.
 */

import type { BuildStack } from './types';

export const DEFAULT_WEBAPP_NAME = 'your-app-name';
export const WEBAPP_STORAGE_PREFIX = 'alphanex_webapp_code_';
export const ACTIVE_APP_NAME_KEY = 'alphanex_active_app_name';

export interface WebAppPage {
  path: string;
  html: string;
}

/**
 * Persists multi-page web app structures in localStorage under ${WEBAPP_STORAGE_PREFIX}${slug}_pages
 */
export function saveWebAppPages(appName: string, pages: WebAppPage[]): void {
  if (typeof window === 'undefined') return;
  const slug = slugifyAppName(appName);
  try {
    localStorage.setItem(`${WEBAPP_STORAGE_PREFIX}${slug}_pages`, JSON.stringify(pages));
  } catch (err) {
    console.warn('Failed to save web app pages to localStorage:', err);
  }
}

/**
 * Retrieves multi-page web app structures from localStorage
 */
export function getWebAppPages(appName?: string): WebAppPage[] {
  if (typeof window === 'undefined') return [];
  const slug = appName
    ? slugifyAppName(appName)
    : localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME;
  try {
    const saved = localStorage.getItem(`${WEBAPP_STORAGE_PREFIX}${slug}_pages`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read web app pages from localStorage:', err);
  }
  return [];
}

export function slugifyAppName(name: string): string {
  if (!name || !name.trim()) return DEFAULT_WEBAPP_NAME;
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || DEFAULT_WEBAPP_NAME;
}

export const DEFAULT_STARTER_WEBAPP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alphanex Web App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
  </style>
</head>
<body class="bg-neutral-50 text-neutral-900 antialiased min-h-screen flex flex-col">
  <!-- Top Navigation -->
  <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
        A
      </div>
      <div>
        <div class="font-bold text-sm text-neutral-900 tracking-tight leading-tight">Alphanex Studio</div>
        <div class="text-[11px] text-neutral-500 font-medium">Interactive Web Preview</div>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Active Build
      </span>
      <button onclick="triggerDemoAction()" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs">
        Launch App
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 space-y-12">
    <div class="text-center space-y-4 max-w-2xl mx-auto">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
        ⚡ Generated in Developer Mode
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
        Build, Preview & Deploy Web Applications
      </h1>
      <p class="text-base text-neutral-600 leading-relaxed">
        This live web application is running directly in your browser sandbox, connected to your AlphanexAI workspace URL.
      </p>
    </div>

    <!-- Interactive Interactive Widget Demo -->
    <div class="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-xs max-w-xl mx-auto space-y-6">
      <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 class="text-sm font-bold text-neutral-900">Interactive Runtime Demo</h2>
          <p class="text-xs text-neutral-500">Test reactive client state in this isolated environment</p>
        </div>
        <span id="counter-badge" class="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-neutral-100 text-neutral-700">Count: 0</span>
      </div>

      <div class="flex items-center justify-center gap-3">
        <button onclick="decrement()" class="w-11 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-lg transition flex items-center justify-center">
          -
        </button>
        <div id="counter-value" class="w-24 text-center font-extrabold text-3xl text-neutral-900">
          0
        </div>
        <button onclick="increment()" class="w-11 h-11 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-lg transition flex items-center justify-center shadow-xs">
          +
        </button>
      </div>

      <div class="space-y-2 pt-2">
        <label class="block text-xs font-semibold text-neutral-700">Custom Message Feedback</label>
        <div class="flex gap-2">
          <input id="demo-input" type="text" placeholder="Type something to update state..." class="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900" />
          <button onclick="submitDemoText()" class="px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition">
            Update
          </button>
        </div>
        <p id="demo-feedback" class="text-xs text-neutral-500 italic">No custom message set yet.</p>
      </div>
    </div>

    <!-- Feature Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
      <div class="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          🌐
        </div>
        <h3 class="text-sm font-bold text-neutral-900">Dedicated URL</h3>
        <p class="text-xs text-neutral-600 leading-relaxed">
          Open this build in a dedicated new tab linked directly to your workspace.
        </p>
      </div>

      <div class="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
        <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
          📱
        </div>
        <h3 class="text-sm font-bold text-neutral-900">Responsive Viewports</h3>
        <p class="text-xs text-neutral-600 leading-relaxed">
          Test desktop, tablet, and mobile layouts with real-time responsive styling.
        </p>
      </div>

      <div class="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
        <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
          🚀
        </div>
        <h3 class="text-sm font-bold text-neutral-900">Production Ready</h3>
        <p class="text-xs text-neutral-600 leading-relaxed">
          Custom domain mapping and Android app bundling coming in upcoming releases.
        </p>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-neutral-200 bg-white py-6 px-4 text-center text-xs text-neutral-500">
    Built with AlphanexAI Studio · Connected to Workspace
  </footer>

  <script>
    let count = 0;
    function updateCounterDisplay() {
      document.getElementById('counter-value').innerText = count;
      document.getElementById('counter-badge').innerText = 'Count: ' + count;
    }
    function increment() {
      count++;
      updateCounterDisplay();
    }
    function decrement() {
      if (count > 0) count--;
      updateCounterDisplay();
    }
    function submitDemoText() {
      const val = document.getElementById('demo-input').value.trim();
      const feedback = document.getElementById('demo-feedback');
      if (val) {
        feedback.innerText = 'Current state: "' + val + '"';
        feedback.className = 'text-xs text-emerald-600 font-semibold';
      }
    }
    function triggerDemoAction() {
      alert('Alphanex Web Preview is working live!');
    }
  </script>
</body>
</html>`;

/**
 * Extracts HTML/Web code from LLM response or code block
 */
export function extractCodeFromMarkdown(text: string): string | null {
  if (!text) return null;

  // 1. Look for ```html ... ```
  const htmlMatch = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlMatch && htmlMatch[1] && htmlMatch[1].trim().length > 20) {
    const raw = htmlMatch[1].trim();
    return ensureCompleteHtml(raw);
  }

  // 2. Look for <!DOCTYPE html> or <html>
  const docTypeMatch = text.match(/(<!DOCTYPE html[\s\S]*?<\/html>)/i);
  if (docTypeMatch && docTypeMatch[1]) {
    return docTypeMatch[1].trim();
  }

  // 3. Look for ```xml / ```svg
  const xmlMatch = text.match(/```(?:xml|svg)\s*([\s\S]*?)```/i);
  if (xmlMatch && xmlMatch[1] && xmlMatch[1].includes('<svg')) {
    return ensureCompleteHtml(`<div class="flex items-center justify-center min-h-screen bg-neutral-900 p-8">${xmlMatch[1].trim()}</div>`);
  }

  return null;
}

export function ensureCompleteHtml(snippet: string): string {
  if (snippet.includes('<html') || snippet.includes('<!DOCTYPE html>')) {
    return snippet;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alphanex App Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-50 text-neutral-900 p-6">
  ${snippet}
</body>
</html>`;
}

/**
 * Parses a model response containing multiple labeled files using the <!-- FILE: <filename.html> --> convention.
 */
export function extractMultiPageFilesFromMarkdown(text: string): WebAppPage[] {
  if (!text || !text.trim()) return [];
  const pages: WebAppPage[] = [];

  // Match <!-- FILE: filename.html -->
  const markerRegex = /<!--\s*FILE:\s*([a-zA-Z0-9_\-./]+)\s*-->/gi;
  const markers: { path: string; index: number; length: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = markerRegex.exec(text)) !== null) {
    let cleanPath = m[1].trim();
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
    if (!cleanPath.includes('.')) cleanPath = `${cleanPath}.html`;
    markers.push({
      path: cleanPath,
      index: m.index,
      length: m[0].length,
    });
  }

  if (markers.length > 0) {
    for (let i = 0; i < markers.length; i++) {
      const current = markers[i];
      const start = current.index + current.length;
      const end = i < markers.length - 1 ? markers[i + 1].index : text.length;
      const segment = text.slice(start, end);

      let htmlContent = '';
      const codeBlockMatch = segment.match(/```(?:html|htm)?\s*([\s\S]*?)```/i);
      if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].trim().length > 10) {
        htmlContent = codeBlockMatch[1].trim();
      } else {
        const docMatch = segment.match(/(<!DOCTYPE html[\s\S]*?<\/html>)/i);
        if (docMatch && docMatch[1]) {
          htmlContent = docMatch[1].trim();
        } else {
          const cleanSnippet = segment.replace(/```(?:html|htm)?/gi, '').replace(/```/g, '').trim();
          if (cleanSnippet.length > 10) {
            htmlContent = cleanSnippet;
          }
        }
      }

      if (htmlContent) {
        pages.push({
          path: current.path,
          html: ensureCompleteHtml(htmlContent),
        });
      }
    }
  }

  // Fallback: if no <!-- FILE: --> marker was found, or only 1 page extracted, inspect any code blocks containing inner markers
  if (pages.length === 0) {
    const codeBlockRegex = /```(?:html|htm)?\s*([\s\S]*?)```/gi;
    let bMatch: RegExpExecArray | null;
    let fallbackIndex = 1;
    while ((bMatch = codeBlockRegex.exec(text)) !== null) {
      const code = bMatch[1].trim();
      if (code.length < 20) continue;
      const innerMatch = code.match(/<!--\s*FILE:\s*([a-zA-Z0-9_\-./]+)\s*-->/i);
      let pagePath = innerMatch ? innerMatch[1].trim() : (fallbackIndex === 1 ? 'index.html' : `page-${fallbackIndex}.html`);
      if (pagePath.startsWith('/')) pagePath = pagePath.slice(1);
      if (!pagePath.includes('.')) pagePath = `${pagePath}.html`;
      pages.push({
        path: pagePath,
        html: ensureCompleteHtml(code),
      });
      fallbackIndex++;
    }
  }

  return pages;
}

/**
 * Wraps generated framework code (React, Next.js, Vue) into a standalone,
 * live-renderable HTML document utilizing CDN scripts (React/ReactDOM/Babel, Vue 3 runtime).
 */
export function wrapGeneratedCodeAsPreviewHtml(code: string, stack: BuildStack): string {
  if (!code || !code.trim()) return '';

  if (stack === 'html-css-js') {
    return ensureCompleteHtml(code);
  }

  if (stack === 'react') {
    return wrapReactPreviewHtml(code, false);
  }

  if (stack === 'nextjs') {
    return wrapReactPreviewHtml(code, true);
  }

  if (stack === 'vue') {
    return wrapVuePreviewHtml(code);
  }

  // Mobile stacks: react-native & flutter remain raw source
  return code;
}

function wrapReactPreviewHtml(code: string, isNextJs: boolean): string {
  // 1. Strip client/server directives
  let transformed = code.replace(/['"]use (?:client|server)['"];?/g, '');

  // 2. Identify default component export name
  let componentName = 'App';
  const defaultFuncMatch = transformed.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  const defaultClassMatch = transformed.match(/export\s+default\s+class\s+([A-Za-z0-9_]+)/);
  const defaultVarMatch = transformed.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/);

  if (defaultFuncMatch && defaultFuncMatch[1]) {
    componentName = defaultFuncMatch[1];
    transformed = transformed.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function $1');
  } else if (defaultClassMatch && defaultClassMatch[1]) {
    componentName = defaultClassMatch[1];
    transformed = transformed.replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/, 'class $1');
  } else if (defaultVarMatch && defaultVarMatch[1]) {
    componentName = defaultVarMatch[1];
    transformed = transformed.replace(/export\s+default\s+[A-Za-z0-9_]+\s*;?/, '');
  } else if (/export\s+default\s+function\s*\(/.test(transformed)) {
    componentName = 'AppPreview';
    transformed = transformed.replace(/export\s+default\s+function\s*\(/, 'function AppPreview(');
  } else if (/export\s+default\s+/.test(transformed)) {
    componentName = 'AppPreview';
    transformed = transformed.replace(/export\s+default\s+/, 'const AppPreview = ');
  } else {
    // If no default export, look for first uppercase identifier
    const fnMatch = transformed.match(/(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/);
    if (fnMatch && fnMatch[1]) {
      componentName = fnMatch[1];
    }
  }

  // 3. Strip remaining export keywords
  transformed = transformed.replace(/export\s+(?:async\s+)?function\s+/g, 'function ');
  transformed = transformed.replace(/export\s+(?:const|let|var)\s+/g, 'const ');
  transformed = transformed.replace(/export\s*\{[^}]*\};?/g, '');

  // 4. Handle lucide-react imports: extract icon names
  const lucideIcons = new Set<string>();
  transformed = transformed.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?/g, (_, names) => {
    names.split(',').forEach((n: string) => {
      const trimmed = n.trim().split(/\s+as\s+/)[0].trim();
      if (trimmed && /^[A-Za-z0-9_]+$/.test(trimmed)) lucideIcons.add(trimmed);
    });
    return '';
  });

  // 5. Strip module imports not resolvable in standalone browser
  transformed = transformed.replace(/import\s+React.*?from\s+['"]react['"];?/g, '');
  transformed = transformed.replace(/import\s+.*?from\s+['"]react-dom(?:[\/\w-]*)?['"];?/g, '');
  transformed = transformed.replace(/import\s+.*?from\s+['"]next\/[\w-]+['"];?/g, '');
  transformed = transformed.replace(/import\s+['"][^'"]+\.(?:css|scss|less)['"];?/g, '');
  transformed = transformed.replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, '');

  const iconShims = Array.from(lucideIcons)
    .map((name) => `const ${name} = __createLucideIcon('${name}');`)
    .join('\n    ');

  const nextBanner = isNextJs
    ? `<div style="background:#FEF3C7; color:#92400E; padding:8px 16px; font-size:12px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #FDE68A; z-index:9999;">
        <span>⚡ <strong>Next.js Client Preview:</strong> Next.js-specific features like routing and server functions aren't previewed here.</span>
        <span style="opacity:0.75; font-size:11px;">Client-side Simulation</span>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alphanex App Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #preview-runtime-error { display: none; padding: 16px; margin: 16px; background: #FEF2F2; color: #991B1B; border: 1px solid #F87171; border-radius: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
  </style>
</head>
<body class="bg-neutral-50 text-neutral-900">
  ${nextBanner}
  <div id="preview-runtime-error"></div>
  <div id="root"></div>

  <script type="text/babel">
    window.addEventListener('error', (event) => {
      const errEl = document.getElementById('preview-runtime-error');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = 'Runtime Error: ' + (event.error ? event.error.message : event.message);
      }
    });

    const {
      useState,
      useEffect,
      useRef,
      useMemo,
      useCallback,
      useContext,
      createContext,
      useReducer,
      useId,
      useLayoutEffect
    } = React;

    // Next.js simulation shims
    const Image = (props) => {
      const { src, alt, width, height, fill, className, ...rest } = props;
      return (
        <img
          src={src || ''}
          alt={alt || ''}
          className={className}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
          {...rest}
        />
      );
    };
    const Link = ({ href, children, className, ...props }) => (
      <a
        href={href || '#'}
        className={className}
        onClick={(e) => {
          if (!href || href === '#') e.preventDefault();
        }}
        {...props}
      >
        {children}
      </a>
    );
    const Head = () => null;
    const useRouter = () => ({
      push: () => {},
      replace: () => {},
      back: () => {},
      pathname: '/',
      query: {},
      asPath: '/',
    });
    const usePathname = () => '/';
    const useSearchParams = () => new URLSearchParams();

    // Lucide Icon Helper
    function __createLucideIcon(name) {
      return function IconWrapper(props) {
        const size = props.size || 20;
        const strokeWidth = props.strokeWidth || 2;
        const className = props.className || '';
        const iconDef = window.lucide?.icons?.[name] || window.lucide?.icons?.[name.toLowerCase()];
        if (iconDef && Array.isArray(iconDef[2])) {
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={className}
              {...props}
            >
              {iconDef[2].map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
            </svg>
          );
        }
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        );
      };
    }

    ${iconShims}

    // Generated Component Code
    ${transformed}

    // Mount Component
    try {
      const rootEl = document.getElementById('root');
      if (rootEl) {
        const TargetComponent = typeof ${componentName} !== 'undefined' ? ${componentName} : (typeof AppPreview !== 'undefined' ? AppPreview : null);
        if (TargetComponent) {
          const root = ReactDOM.createRoot(rootEl);
          root.render(<TargetComponent />);
        } else {
          throw new Error("Could not find root component '${componentName}' to mount.");
        }
      }
    } catch (err) {
      console.error("Mount error:", err);
      const errEl = document.getElementById('preview-runtime-error');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = 'Mount Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
}

function wrapVuePreviewHtml(code: string): string {
  // Extract template
  const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  const templateHtml = templateMatch ? templateMatch[1].trim() : '<div class="p-6">Empty Vue Component</div>';

  // Extract all styles
  const styleMatches = Array.from(code.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi));
  const styleCss = styleMatches.map((m) => m[1]).join('\n');

  // Extract script
  const scriptMatch = code.match(/<script([^>]*)>([\s\S]*?)<\/script>/i);
  const isScriptSetup = scriptMatch ? scriptMatch[1].includes('setup') : false;
  let rawScript = scriptMatch ? scriptMatch[2].trim() : '';

  // Clean imports from script
  rawScript = rawScript.replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, '');
  rawScript = rawScript.replace(/export\s+default\s+/g, 'const __userComponent = ');

  let componentScript = '';
  if (isScriptSetup) {
    // Extract top-level variable and function declarations to return from setup()
    const varNames = new Set<string>();
    for (const m of rawScript.matchAll(/function\s+([A-Za-z0-9_$]+)/g)) {
      varNames.add(m[1]);
    }
    for (const m of rawScript.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$,\s{}]+?)\s*=/g)) {
      const raw = m[1].replace(/[{}]/g, '');
      raw.split(',').forEach((v) => {
        const clean = v.trim().split(':')[0].trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(clean)) {
          varNames.add(clean);
        }
      });
    }

    const returnsCode = Array.from(varNames)
      .map((v) => `try { if (typeof ${v} !== 'undefined') __ret.${v} = ${v}; } catch(e) {}`)
      .join('\n        ');

    componentScript = `
      const appComponent = {
        template: '#app-template',
        setup() {
          const { ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, nextTick, toRefs } = Vue;
          ${rawScript}
          const __ret = {};
          ${returnsCode}
          return __ret;
        }
      };`;
  } else if (rawScript.includes('__userComponent')) {
    componentScript = `
      ${rawScript}
      const appComponent = {
        template: '#app-template',
        ...__userComponent
      };`;
  } else {
    componentScript = `
      const appComponent = {
        template: '#app-template'
      };`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alphanex Vue App Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #preview-runtime-error { display: none; padding: 16px; margin: 16px; background: #FEF2F2; color: #991B1B; border: 1px solid #F87171; border-radius: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
    ${styleCss}
  </style>
</head>
<body class="bg-neutral-50 text-neutral-900">
  <div id="preview-runtime-error"></div>
  <div id="app"></div>

  <script type="text/x-template" id="app-template">
    ${templateHtml}
  </script>

  <script>
    window.addEventListener('error', (event) => {
      const errEl = document.getElementById('preview-runtime-error');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = 'Runtime Error: ' + (event.error ? event.error.message : event.message);
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      try {
        ${componentScript}

        const app = Vue.createApp(appComponent);
        app.config.errorHandler = (err) => {
          console.error("Vue error:", err);
          const errEl = document.getElementById('preview-runtime-error');
          if (errEl) {
            errEl.style.display = 'block';
            errEl.textContent = 'Vue Error: ' + (err.message || String(err));
          }
        };
        app.mount('#app');
      } catch (err) {
        console.error("Initialization error:", err);
        const errEl = document.getElementById('preview-runtime-error');
        if (errEl) {
          errEl.style.display = 'block';
          errEl.textContent = 'Initialization Error: ' + err.message;
        }
      }
    });
  </script>
</body>
</html>`;
}

