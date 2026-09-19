'use client';

import { BuildStack } from './types';

export const DEFAULT_WEBAPP_NAME = 'your-app-name';
export const WEBAPP_STORAGE_PREFIX = 'alphanex_webapp_code_';
export const ACTIVE_APP_NAME_KEY = 'alphanex_active_app_name';
export const BUILD_STACK_KEY = 'alphanex_build_stack';
export const DEFAULT_BUILD_STACK: BuildStack = 'html-css-js';

export function getStoredBuildStack(): BuildStack {
  if (typeof window === 'undefined') return DEFAULT_BUILD_STACK;
  try {
    const val = localStorage.getItem(BUILD_STACK_KEY);
    if (val && ['html-css-js', 'react', 'vue', 'nextjs', 'react-native', 'flutter'].includes(val)) {
      return val as BuildStack;
    }
  } catch {}
  return DEFAULT_BUILD_STACK;
}

export function setStoredBuildStack(stack: BuildStack): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BUILD_STACK_KEY, stack);
    window.dispatchEvent(new CustomEvent('alphanex-build-stack-changed', { detail: { stack } }));
  } catch {}
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

export type TerminalLogLevel = 'log' | 'info' | 'warn' | 'error' | 'build' | 'hmr' | 'system';

export interface TerminalLogEntry {
  id: string;
  timestamp: number;
  level: TerminalLogLevel;
  message: string;
  source?: string;
  stack?: string;
  count?: number;
}

export type WebAppRuntimeStatus = 'ready' | 'compiling' | 'hot-reloading' | 'error' | 'idle';

export function broadcastTerminalLog(
  entry: Omit<TerminalLogEntry, 'id' | 'timestamp'> & { timestamp?: number }
): void {
  if (typeof window === 'undefined') return;
  const fullEntry: TerminalLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || Date.now(),
    ...entry,
  };
  window.dispatchEvent(new CustomEvent('alphanex-terminal-log', { detail: fullEntry }));
}

/**
 * Validates HTML and script tags for compilation and syntax errors
 */
export function validateHtmlSyntax(html: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!html || !html.trim()) {
    errors.push('Empty application document');
    return { valid: false, errors, warnings };
  }

  // Check doctype or root
  if (!html.toLowerCase().includes('<!doctype html') && !html.toLowerCase().includes('<html')) {
    warnings.push('Missing <!DOCTYPE html> declaration or <html> root');
  }

  // Check script tags for syntax validity
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptBody = match[1];
    if (scriptBody && scriptBody.trim() && !match[0].includes('alphanex-hmr-runtime')) {
      try {
        // Test parsing via Function constructor
        new Function(scriptBody);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Compilation / Syntax Error in <script>: ${message}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export const HMR_CLIENT_SCRIPT = `
<!-- Alphanex Live HMR & Auto-Refresh Runtime -->
<script id="alphanex-hmr-runtime">
(function() {
  if (window.__alphanex_hmr_installed) return;
  window.__alphanex_hmr_installed = true;

  // Intercept and forward console logs & runtime errors to parent terminal
  var origConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  function sendLog(level, args, stack) {
    try {
      var text = Array.from(args).map(function(item) {
        if (typeof item === 'object') {
          try { return JSON.stringify(item); } catch (e) { return String(item); }
        }
        return String(item);
      }).join(' ');

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'ALPHANEX_SANDBOX_LOG',
          payload: {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            level: level,
            message: text,
            timestamp: Date.now(),
            source: 'sandbox',
            stack: stack || null
          }
        }, '*');
      }
    } catch (err) {}
  }

  console.log = function() {
    origConsole.log.apply(console, arguments);
    sendLog('log', arguments);
  };
  console.info = function() {
    origConsole.info.apply(console, arguments);
    sendLog('info', arguments);
  };
  console.warn = function() {
    origConsole.warn.apply(console, arguments);
    sendLog('warn', arguments);
  };
  console.error = function() {
    origConsole.error.apply(console, arguments);
    sendLog('error', arguments, (new Error()).stack);
  };

  window.addEventListener('error', function(e) {
    var msg = e.message || 'Uncaught runtime error';
    var file = e.filename ? e.filename.split('/').pop() : 'inline';
    var line = e.lineno ? ' (line ' + e.lineno + (e.colno ? ':' + e.colno : '') + ')' : '';
    var full = msg + line;
    sendLog('error', [full], e.error ? e.error.stack : null);
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled Promise Rejection';
    sendLog('error', ['[Unhandled Promise Rejection] ' + reason], e.reason && e.reason.stack ? e.reason.stack : null);
  });

  function showHmrToast(msg, isSuccess) {
    if (isSuccess === undefined) isSuccess = true;
    try {
      var toast = document.getElementById('alphanex-hmr-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'alphanex-hmr-toast';
        toast.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:999999;padding:6px 14px;border-radius:9999px;font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:700;display:flex;align-items:center;gap:6px;box-shadow:0 8px 24px rgba(0,0,0,0.22);pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease;transform:translateY(8px);opacity:0;';
        document.documentElement.appendChild(toast);
      }
      toast.style.background = isSuccess ? '#064e3b' : '#7f1d1d';
      toast.style.color = isSuccess ? '#34d399' : '#fca5a5';
      toast.style.border = isSuccess ? '1px solid #059669' : '1px solid #dc2626';
      toast.innerHTML = '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + (isSuccess ? '#10b981' : '#ef4444') + '"></span>' + msg;
      
      requestAnimationFrame(function() {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      clearTimeout(window.__alphanex_hmr_toast_timer);
      window.__alphanex_hmr_toast_timer = setTimeout(function() {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(8px)';
        }
      }, 2000);
    } catch (e) {}
  }

  function applyHotUpdate(newHtml) {
    var startTime = performance.now();
    try {
      sendLog('hmr', ['[HMR] Applying hot module replacement update...']);
      var parser = new DOMParser();
      var newDoc = parser.parseFromString(newHtml, 'text/html');

      // 1. Update Title
      if (newDoc.title && newDoc.title !== document.title) {
        document.title = newDoc.title;
      }

      // 2. Hot-swap styles & links
      var currentStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
      var newStyles = Array.from(newDoc.head.querySelectorAll('style, link[rel="stylesheet"]'));
      var stylesChanged = currentStyles.length !== newStyles.length || 
        newStyles.some(function(ns, i) { return !currentStyles[i] || currentStyles[i].outerHTML !== ns.outerHTML; });

      if (stylesChanged) {
        currentStyles.forEach(function(s) { s.remove(); });
        newStyles.forEach(function(ns) {
          document.head.appendChild(document.importNode(ns, true));
        });
      }

      // 3. Preserve scroll position and focused element
      var scrollX = window.scrollX || window.pageXOffset || 0;
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var activeId = document.activeElement ? document.activeElement.id : null;

      // 4. Update body
      if (newDoc.body) {
        document.body.className = newDoc.body.className;
        document.body.innerHTML = newDoc.body.innerHTML;

        // 5. Re-execute scripts
        var scripts = Array.from(newDoc.querySelectorAll('script'));
        scripts.forEach(function(oldScript) {
          if (oldScript.id === 'alphanex-hmr-runtime') return;
          var newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(function(attr) {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = oldScript.textContent;
          document.body.appendChild(newScript);
        });
      }

      // Restore scroll
      window.scrollTo(scrollX, scrollY);
      if (activeId) {
        var el = document.getElementById(activeId);
        if (el && typeof el.focus === 'function') el.focus();
      }

      var elapsed = Math.round(performance.now() - startTime);
      showHmrToast('⚡ HMR Hot-Updated (' + elapsed + 'ms)', true);
      sendLog('hmr', ['[HMR] Hot update applied successfully in ' + elapsed + 'ms']);

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'ALPHANEX_HMR_ACK',
          status: 'success',
          elapsedMs: elapsed,
          timestamp: Date.now()
        }, '*');
      }

      window.dispatchEvent(new CustomEvent('alphanex-hmr-done', { detail: { elapsed: elapsed } }));
      return true;
    } catch (err) {
      console.warn('[Alphanex HMR] Soft replacement failed, auto-refreshing document:', err);
      sendLog('warn', ['[HMR] Soft replacement error, falling back to full refresh: ' + (err.message || String(err))]);
      try {
        document.open();
        document.write(newHtml);
        document.close();
        showHmrToast('⚡ Sandbox Auto-Refreshed', true);
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'ALPHANEX_HMR_ACK', status: 'fallback', timestamp: Date.now() }, '*');
        }
        return true;
      } catch (writeErr) {
        window.location.reload();
        return false;
      }
    }
  }

  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'ALPHANEX_HMR_UPDATE') {
      if (typeof event.data.html === 'string' && event.data.html.length > 0) {
        applyHotUpdate(event.data.html);
      }
    } else if (event.data.type === 'ALPHANEX_HMR_PING') {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ALPHANEX_HMR_PONG', timestamp: Date.now() }, '*');
      }
    } else if (event.data.type === 'ALPHANEX_SANDBOX_EVAL') {
      try {
        var evalResult = window.eval(event.data.code);
        sendLog('log', ['[eval result]', evalResult]);
      } catch (evalErr) {
        sendLog('error', ['[eval error] ' + (evalErr.message || String(evalErr))], evalErr.stack);
      }
    }
  });

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'ALPHANEX_HMR_READY',
      timestamp: Date.now(),
      domNodes: document.getElementsByTagName('*').length,
      url: window.location.href
    }, '*');
    sendLog('system', ['Web application sandbox runtime initialized and listening for commands.']);
  }
})();
</script>
`;

/**
 * Prepares HTML by ensuring proper structure and injecting HMR client runtime
 */
export function prepareHmrHtml(html: string): string {
  if (!html || !html.trim()) {
    return prepareHmrHtml(DEFAULT_STARTER_WEBAPP_HTML);
  }

  let formatted = ensureCompleteHtml(html);

  // If already contains HMR runtime, don't duplicate
  if (formatted.includes('id="alphanex-hmr-runtime"')) {
    return formatted;
  }

  // Inject before </head> or </body> or at the end
  if (formatted.includes('</head>')) {
    formatted = formatted.replace('</head>', `${HMR_CLIENT_SCRIPT}\n</head>`);
  } else if (formatted.includes('</body>')) {
    formatted = formatted.replace('</body>', `${HMR_CLIENT_SCRIPT}\n</body>`);
  } else {
    formatted = `${formatted}\n${HMR_CLIENT_SCRIPT}`;
  }

  return formatted;
}

/**
 * Sends an HMR update message to an iframe content window
 */
export function sendHmrUpdateToWindow(
  targetWindow: Window | null | undefined,
  html: string,
  appName?: string
): boolean {
  if (!targetWindow) return false;
  try {
    targetWindow.postMessage(
      {
        type: 'ALPHANEX_HMR_UPDATE',
        html: prepareHmrHtml(html),
        appName: slugifyAppName(appName || DEFAULT_WEBAPP_NAME),
        timestamp: Date.now(),
      },
      '*'
    );
    return true;
  } catch (err) {
    console.warn('[Alphanex HMR] Failed to postMessage HMR update:', err);
    return false;
  }
}

/**
 * Save web app code into local storage and broadcast HMR update
 */
export function saveWebAppData(appName: string, html: string): void {
  if (typeof window === 'undefined') return;
  const slug = slugifyAppName(appName);
  try {
    localStorage.setItem(`${WEBAPP_STORAGE_PREFIX}${slug}`, html);
    localStorage.setItem(ACTIVE_APP_NAME_KEY, slug);

    // Notify same-window listeners
    window.dispatchEvent(
      new CustomEvent('alphanex-webapp-updated', {
        detail: { appName: slug, html, timestamp: Date.now() },
      })
    );

    // Broadcast across other browser tabs/windows
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('alphanex_webapp_hmr');
        bc.postMessage({
          type: 'ALPHANEX_HMR_UPDATE',
          appName: slug,
          html,
          timestamp: Date.now(),
        });
        bc.close();
      } catch {}
    }
  } catch (err) {
    console.warn('Failed to save web app to localStorage:', err);
  }
}

/**
 * Get web app code from local storage
 */
export function getWebAppData(appName?: string): { appName: string; html: string } {
  if (typeof window === 'undefined') {
    return {
      appName: appName ? slugifyAppName(appName) : DEFAULT_WEBAPP_NAME,
      html: DEFAULT_STARTER_WEBAPP_HTML,
    };
  }

  const slug = appName
    ? slugifyAppName(appName)
    : localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME;

  try {
    const saved = localStorage.getItem(`${WEBAPP_STORAGE_PREFIX}${slug}`);
    if (saved && saved.trim().length > 10) {
      return { appName: slug, html: saved };
    }
  } catch (err) {
    console.warn('Failed to read web app from localStorage:', err);
  }

  return { appName: slug, html: DEFAULT_STARTER_WEBAPP_HTML };
}

/**
 * Generates absolute or relative preview link
 */
export function getPreviewUrl(appName?: string, origin?: string): string {
  const slug = slugifyAppName(appName || DEFAULT_WEBAPP_NAME);
  const base =
    origin ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://alphanexai.vercel.app');
  return `${base}/workspace/${slug}/preview`;
}
