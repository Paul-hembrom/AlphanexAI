'use client';

export const DEFAULT_WEBAPP_NAME = 'your-app-name';
export const WEBAPP_STORAGE_PREFIX = 'alphanex_webapp_code_';
export const ACTIVE_APP_NAME_KEY = 'alphanex_active_app_name';

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
 * Save web app code into local storage
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
        detail: { appName: slug, html },
      })
    );
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
