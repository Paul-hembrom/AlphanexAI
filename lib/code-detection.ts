/**
 * Automatic File Type Detection & Syntax Highlighting Engine for Code Diff Canvas
 * 
 * Provides:
 * 1. Extension-based and content-heuristic file type detection.
 * 2. Language-specific indentation rules (tabSize, spaces vs tabs, indentation guides).
 * 3. Token-level syntax highlighting for side-by-side and unified diff viewers.
 */

import Prism from 'prismjs';

// Order of language component imports is important due to dependencies
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-graphql';

export interface IndentationConfig {
  tabSize: number;
  useTabs: boolean;
  indentUnit: string;
  indentGuide: string;
  trimTrailingWhitespace: boolean;
}

export interface FileTypeInfo {
  id: string;
  name: string;
  extension: string;
  category: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  prismLanguage: string;
  indentation: IndentationConfig;
}

export interface HighlightToken {
  type: string;
  content: string;
  styleClass?: string;
  colorHex?: string;
}

// Map extensions to file type definitions
const EXTENSION_REGISTRY: Record<string, Omit<FileTypeInfo, 'extension'>> = {
  // Python
  py: {
    id: 'python',
    name: 'Python',
    category: 'Scripting / Backend',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/50',
    prismLanguage: 'python',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'PEP 8: 4 spaces per indentation level',
      trimTrailingWhitespace: true,
    },
  },
  pyw: {
    id: 'python',
    name: 'Python',
    category: 'Scripting',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/50',
    prismLanguage: 'python',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'PEP 8: 4 spaces',
      trimTrailingWhitespace: true,
    },
  },
  ipynb: {
    id: 'python',
    name: 'Jupyter Notebook',
    category: 'Data Science',
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-700/50',
    prismLanguage: 'python',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: '4 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // TypeScript & TSX
  ts: {
    id: 'typescript',
    name: 'TypeScript',
    category: 'Application / Frontend',
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-700/50',
    prismLanguage: 'typescript',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'TS Standard: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  mts: {
    id: 'typescript',
    name: 'TypeScript (ESM)',
    category: 'Application',
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-700/50',
    prismLanguage: 'typescript',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  cts: {
    id: 'typescript',
    name: 'TypeScript (CJS)',
    category: 'Application',
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-700/50',
    prismLanguage: 'typescript',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  tsx: {
    id: 'tsx',
    name: 'React TSX',
    category: 'React UI',
    badgeBg: 'bg-cyan-950/60',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-700/50',
    prismLanguage: 'tsx',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'JSX/React: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // JavaScript & JSX
  js: {
    id: 'javascript',
    name: 'JavaScript',
    category: 'Web / Node.js',
    badgeBg: 'bg-yellow-950/60',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-700/50',
    prismLanguage: 'javascript',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'Standard: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  mjs: {
    id: 'javascript',
    name: 'JavaScript (ESM)',
    category: 'Web / Node.js',
    badgeBg: 'bg-yellow-950/60',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-700/50',
    prismLanguage: 'javascript',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  cjs: {
    id: 'javascript',
    name: 'JavaScript (CJS)',
    category: 'Web / Node.js',
    badgeBg: 'bg-yellow-950/60',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-700/50',
    prismLanguage: 'javascript',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  jsx: {
    id: 'jsx',
    name: 'React JSX',
    category: 'React UI',
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-700/50',
    prismLanguage: 'jsx',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // Rust
  rs: {
    id: 'rust',
    name: 'Rust',
    category: 'Systems',
    badgeBg: 'bg-orange-950/60',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-700/50',
    prismLanguage: 'rust',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'Rustfmt: 4 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // Go
  go: {
    id: 'go',
    name: 'Go',
    category: 'Systems / Backend',
    badgeBg: 'bg-teal-950/60',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-700/50',
    prismLanguage: 'go',
    indentation: {
      tabSize: 4,
      useTabs: true,
      indentUnit: 'Tabs (4-width)',
      indentGuide: 'gofmt: Hard tabs (4 spaces display)',
      trimTrailingWhitespace: true,
    },
  },

  // SQL
  sql: {
    id: 'sql',
    name: 'SQL',
    category: 'Database',
    badgeBg: 'bg-purple-950/60',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-700/50',
    prismLanguage: 'sql',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'SQL Standard: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  pgsql: {
    id: 'sql',
    name: 'PostgreSQL',
    category: 'Database',
    badgeBg: 'bg-purple-950/60',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-700/50',
    prismLanguage: 'sql',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // JSON & Config
  json: {
    id: 'json',
    name: 'JSON',
    category: 'Data / Config',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-700/50',
    prismLanguage: 'json',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'JSON Standard: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  jsonc: {
    id: 'json',
    name: 'JSON with Comments',
    category: 'Config',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-700/50',
    prismLanguage: 'json',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // HTML & Markup
  html: {
    id: 'html',
    name: 'HTML',
    category: 'Markup',
    badgeBg: 'bg-red-950/60',
    badgeText: 'text-red-300',
    badgeBorder: 'border-red-700/50',
    prismLanguage: 'html',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'HTML: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  htm: {
    id: 'html',
    name: 'HTML',
    category: 'Markup',
    badgeBg: 'bg-red-950/60',
    badgeText: 'text-red-300',
    badgeBorder: 'border-red-700/50',
    prismLanguage: 'html',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // CSS & Styles
  css: {
    id: 'css',
    name: 'CSS',
    category: 'Styles',
    badgeBg: 'bg-pink-950/60',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-700/50',
    prismLanguage: 'css',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'CSS: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  scss: {
    id: 'css',
    name: 'SCSS',
    category: 'Styles',
    badgeBg: 'bg-pink-950/60',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-700/50',
    prismLanguage: 'css',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // Shell / Bash
  sh: {
    id: 'bash',
    name: 'Shell Script',
    category: 'DevOps / CLI',
    badgeBg: 'bg-lime-950/60',
    badgeText: 'text-lime-300',
    badgeBorder: 'border-lime-700/50',
    prismLanguage: 'bash',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'POSIX Shell: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    category: 'DevOps / CLI',
    badgeBg: 'bg-lime-950/60',
    badgeText: 'text-lime-300',
    badgeBorder: 'border-lime-700/50',
    prismLanguage: 'bash',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  zsh: {
    id: 'bash',
    name: 'Zsh',
    category: 'DevOps / CLI',
    badgeBg: 'bg-lime-950/60',
    badgeText: 'text-lime-300',
    badgeBorder: 'border-lime-700/50',
    prismLanguage: 'bash',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // YAML
  yml: {
    id: 'yaml',
    name: 'YAML',
    category: 'Config / CI-CD',
    badgeBg: 'bg-rose-950/60',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-700/50',
    prismLanguage: 'yaml',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces (strict)',
      indentGuide: 'YAML: Strict 2 spaces (no tabs allowed)',
      trimTrailingWhitespace: true,
    },
  },
  yaml: {
    id: 'yaml',
    name: 'YAML',
    category: 'Config / CI-CD',
    badgeBg: 'bg-rose-950/60',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-700/50',
    prismLanguage: 'yaml',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces (strict)',
      indentGuide: 'YAML: Strict 2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // TOML
  toml: {
    id: 'toml',
    name: 'TOML',
    category: 'Config',
    badgeBg: 'bg-stone-900',
    badgeText: 'text-stone-300',
    badgeBorder: 'border-stone-700',
    prismLanguage: 'toml',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // Markdown
  md: {
    id: 'markdown',
    name: 'Markdown',
    category: 'Docs',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-700',
    prismLanguage: 'markdown',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 or 4 spaces',
      trimTrailingWhitespace: false,
    },
  },
  mdx: {
    id: 'markdown',
    name: 'MDX',
    category: 'Docs / React',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-700',
    prismLanguage: 'markdown',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: false,
    },
  },

  // C / C++ / C# / Java
  c: {
    id: 'c',
    name: 'C',
    category: 'Systems',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/50',
    prismLanguage: 'c',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'K&R / ANSI: 4 spaces',
      trimTrailingWhitespace: true,
    },
  },
  h: {
    id: 'c',
    name: 'C Header',
    category: 'Systems',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/50',
    prismLanguage: 'c',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: '4 spaces',
      trimTrailingWhitespace: true,
    },
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    category: 'Systems',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/50',
    prismLanguage: 'cpp',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'ISO C++: 4 spaces',
      trimTrailingWhitespace: true,
    },
  },
  hpp: {
    id: 'cpp',
    name: 'C++ Header',
    category: 'Systems',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-700/50',
    prismLanguage: 'cpp',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: '4 spaces',
      trimTrailingWhitespace: true,
    },
  },
  java: {
    id: 'java',
    name: 'Java',
    category: 'Enterprise / Backend',
    badgeBg: 'bg-orange-950/60',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-700/50',
    prismLanguage: 'java',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'Oracle Java Style: 4 spaces',
      trimTrailingWhitespace: true,
    },
  },
  cs: {
    id: 'csharp',
    name: 'C#',
    category: '.NET / Backend',
    badgeBg: 'bg-violet-950/60',
    badgeText: 'text-violet-300',
    badgeBorder: 'border-violet-700/50',
    prismLanguage: 'csharp',
    indentation: {
      tabSize: 4,
      useTabs: false,
      indentUnit: '4 spaces',
      indentGuide: 'Microsoft .NET: 4 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // Ruby
  rb: {
    id: 'ruby',
    name: 'Ruby',
    category: 'Scripting / Rails',
    badgeBg: 'bg-red-950/60',
    badgeText: 'text-red-300',
    badgeBorder: 'border-red-700/50',
    prismLanguage: 'ruby',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: 'Ruby Style Guide: 2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // Docker
  dockerfile: {
    id: 'dockerfile',
    name: 'Dockerfile',
    category: 'DevOps / Containers',
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-700/50',
    prismLanguage: 'docker',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },

  // GraphQL
  graphql: {
    id: 'graphql',
    name: 'GraphQL',
    category: 'API / Schema',
    badgeBg: 'bg-pink-950/60',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-700/50',
    prismLanguage: 'graphql',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
  gql: {
    id: 'graphql',
    name: 'GraphQL',
    category: 'API / Schema',
    badgeBg: 'bg-pink-950/60',
    badgeText: 'text-pink-300',
    badgeBorder: 'border-pink-700/50',
    prismLanguage: 'graphql',
    indentation: {
      tabSize: 2,
      useTabs: false,
      indentUnit: '2 spaces',
      indentGuide: '2 spaces',
      trimTrailingWhitespace: true,
    },
  },
};

// Fallback for plain text / unknown files
const DEFAULT_FILE_TYPE: FileTypeInfo = {
  id: 'plaintext',
  name: 'Plain Text',
  extension: '.txt',
  category: 'General',
  badgeBg: 'bg-neutral-800',
  badgeText: 'text-neutral-300',
  badgeBorder: 'border-neutral-700',
  prismLanguage: 'markup',
  indentation: {
    tabSize: 4,
    useTabs: false,
    indentUnit: '4 spaces',
    indentGuide: 'Default: 4 spaces',
    trimTrailingWhitespace: true,
  },
};

/**
 * Detect file type from filename or path with heuristic content fallback
 */
export function detectFileType(filenameOrPath: string, codeContent?: string): FileTypeInfo {
  if (!filenameOrPath) {
    if (codeContent) {
      return detectFromContent(codeContent);
    }
    return DEFAULT_FILE_TYPE;
  }

  // Clean filename: remove query strings or anchors if any
  const cleanName = filenameOrPath.split('?')[0].split('#')[0];
  const baseName = cleanName.split('/').pop() || cleanName;
  const lowerBase = baseName.toLowerCase();

  // 1. Exact match special filenames
  if (lowerBase === 'dockerfile') {
    return { ...EXTENSION_REGISTRY['dockerfile'], extension: 'dockerfile' };
  }
  if (lowerBase === 'makefile' || lowerBase === 'gnumakefile') {
    return {
      id: 'makefile',
      name: 'Makefile',
      extension: 'mk',
      category: 'Build System',
      badgeBg: 'bg-stone-900',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-stone-700',
      prismLanguage: 'bash',
      indentation: {
        tabSize: 4,
        useTabs: true,
        indentUnit: 'Tabs (required)',
        indentGuide: 'Make requires hard tabs for recipe lines',
        trimTrailingWhitespace: false,
      },
    };
  }
  if (lowerBase === '.gitignore' || lowerBase === '.npmignore' || lowerBase === '.dockerignore') {
    return {
      id: 'ignore',
      name: 'Ignore List',
      extension: 'ignore',
      category: 'Git / Config',
      badgeBg: 'bg-neutral-900',
      badgeText: 'text-neutral-300',
      badgeBorder: 'border-neutral-700',
      prismLanguage: 'bash',
      indentation: {
        tabSize: 2,
        useTabs: false,
        indentUnit: '2 spaces',
        indentGuide: '2 spaces',
        trimTrailingWhitespace: true,
      },
    };
  }
  if (lowerBase.startsWith('.env')) {
    return {
      id: 'env',
      name: 'Environment Config',
      extension: 'env',
      category: 'Config',
      badgeBg: 'bg-emerald-950/60',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-700/50',
      prismLanguage: 'bash',
      indentation: {
        tabSize: 2,
        useTabs: false,
        indentUnit: '2 spaces',
        indentGuide: '2 spaces',
        trimTrailingWhitespace: true,
      },
    };
  }

  // 2. Multi-extension match (e.g., .d.ts, .test.tsx)
  if (lowerBase.endsWith('.d.ts')) {
    return { ...EXTENSION_REGISTRY['ts'], name: 'TypeScript Defs', extension: '.d.ts' };
  }
  if (lowerBase.endsWith('.test.tsx') || lowerBase.endsWith('.spec.tsx')) {
    return { ...EXTENSION_REGISTRY['tsx'], name: 'React TSX (Test)', extension: '.tsx' };
  }

  // 3. Standard extension extraction
  const dotIndex = lowerBase.lastIndexOf('.');
  if (dotIndex !== -1 && dotIndex < lowerBase.length - 1) {
    const ext = lowerBase.slice(dotIndex + 1);
    if (EXTENSION_REGISTRY[ext]) {
      return {
        ...EXTENSION_REGISTRY[ext],
        extension: `.${ext}`,
      };
    }
  }

  // 4. Fallback to content inspection if code is available
  if (codeContent) {
    return detectFromContent(codeContent, lowerBase);
  }

  return {
    ...DEFAULT_FILE_TYPE,
    extension: dotIndex !== -1 ? `.${lowerBase.slice(dotIndex + 1)}` : '',
  };
}

/**
 * Heuristic detector from code content when extension is unknown or ambiguous
 */
function detectFromContent(code: string, filenameHint: string = ''): FileTypeInfo {
  const trimmed = code.trim();

  // Python: def ..., import ..., elif ..., f"..."
  if (
    /^(import\s+[\w.]+|from\s+[\w.]+\s+import|def\s+\w+\s*\(.*?\)\s*:|class\s+\w+.*?:)/m.test(trimmed) ||
    trimmed.includes('#!/usr/bin/env python')
  ) {
    return { ...EXTENSION_REGISTRY['py'], extension: '.py' };
  }

  // HTML
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return { ...EXTENSION_REGISTRY['html'], extension: '.html' };
  }

  // JSON
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmed);
      return { ...EXTENSION_REGISTRY['json'], extension: '.json' };
    } catch {
      // not strict JSON, continue
    }
  }

  // React TSX / JSX
  if (
    (trimmed.includes('import React') || trimmed.includes("from 'react'") || trimmed.includes('export default function')) &&
    (trimmed.includes('<') && trimmed.includes('/>') || trimmed.includes('className='))
  ) {
    return { ...EXTENSION_REGISTRY['tsx'], extension: '.tsx' };
  }

  // TypeScript / JavaScript
  if (
    trimmed.includes('interface ') ||
    trimmed.includes('type ') ||
    trimmed.includes(': string') ||
    trimmed.includes(': number') ||
    trimmed.includes(': boolean')
  ) {
    return { ...EXTENSION_REGISTRY['ts'], extension: '.ts' };
  }

  // SQL
  if (/^(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/im.test(trimmed)) {
    return { ...EXTENSION_REGISTRY['sql'], extension: '.sql' };
  }

  // Rust
  if (trimmed.includes('fn main()') || trimmed.includes('pub fn ') || trimmed.includes('impl ') || trimmed.includes('let mut ')) {
    return { ...EXTENSION_REGISTRY['rs'], extension: '.rs' };
  }

  // Go
  if (/^package\s+\w+/m.test(trimmed) && trimmed.includes('func ')) {
    return { ...EXTENSION_REGISTRY['go'], extension: '.go' };
  }

  // Shell
  if (trimmed.startsWith('#!/bin/bash') || trimmed.startsWith('#!/bin/sh') || trimmed.startsWith('#!/usr/bin/env bash')) {
    return { ...EXTENSION_REGISTRY['sh'], extension: '.sh' };
  }

  return {
    ...DEFAULT_FILE_TYPE,
    name: filenameHint ? `File (${filenameHint})` : 'Plain Text',
  };
}

/**
 * Tokenize a single line using Prism grammar and return styled token nodes
 * with modern VS Code Dark theme colors.
 */
export function tokenizeDiffLine(line: string, languageId: string): HighlightToken[] {
  if (!line) {
    return [{ type: 'plain', content: '' }];
  }

  const grammar = Prism.languages[languageId] || Prism.languages.clike || Prism.languages.markup;
  if (!grammar) {
    return [{ type: 'plain', content: line, colorHex: '#D4D4D4' }];
  }

  try {
    const rawTokens = Prism.tokenize(line, grammar);
    return flattenPrismTokens(rawTokens);
  } catch {
    return [{ type: 'plain', content: line, colorHex: '#D4D4D4' }];
  }
}

/**
 * Recursively flatten Prism Token / Token[] / string structure into flat list of tokens
 */
function flattenPrismTokens(tokens: Array<string | Prism.Token>): HighlightToken[] {
  const result: HighlightToken[] = [];

  for (const token of tokens) {
    if (typeof token === 'string') {
      result.push({
        type: 'plain',
        content: token,
        colorHex: '#D4D4D4',
      });
    } else {
      const type = token.type;
      const colorHex = getTokenColor(type);

      if (typeof token.content === 'string') {
        result.push({
          type,
          content: token.content,
          colorHex,
        });
      } else if (Array.isArray(token.content)) {
        const nested = flattenPrismTokens(token.content);
        for (const n of nested) {
          // Inherit parent token color if child is plain
          result.push({
            type: n.type === 'plain' ? type : n.type,
            content: n.content,
            colorHex: n.type === 'plain' ? colorHex : n.colorHex,
          });
        }
      } else if (token.content && typeof token.content === 'object') {
        const nested = flattenPrismTokens([token.content as Prism.Token]);
        result.push(...nested);
      }
    }
  }

  return result;
}

/**
 * VS Code Dark Modern Theme Color Mapping
 */
export function getTokenColor(type: string): string {
  switch (type) {
    case 'keyword':
    case 'atrule':
      return '#C586C0'; // Purple / Magenta (import, def, return, const, from)
    
    case 'string':
    case 'char':
      return '#CE9178'; // Warm orange / Salmon ("hello", 'utf-8')
    
    case 'number':
      return '#B5CEA8'; // Soft light green (12, 3.14)
    
    case 'function':
      return '#DCDCAA'; // Golden yellow (function calls and declarations)
    
    case 'comment':
    case 'prolog':
    case 'doctype':
    case 'cdata':
      return '#6A9955'; // Muted forest green (comments)
    
    case 'class-name':
    case 'maybe-class-name':
      return '#4EC9B0'; // Soft teal (Types, Interfaces, Classes)
    
    case 'boolean':
    case 'constant':
      return '#569CD6'; // Keyword blue (True, False, null, undefined)
    
    case 'property':
    case 'property-access':
    case 'attr-name':
      return '#9CDCFE'; // Light sky blue (keys, properties, attributes)
    
    case 'tag':
      return '#569CD6'; // HTML / JSX tag names (div, span, button)
    
    case 'operator':
      return '#D4D4D4'; // Neutral operator (+, -, =, :)
    
    case 'punctuation':
      return '#808080'; // Dim punctuation ({}, [], (), ;)
    
    case 'regex':
      return '#D16969'; // Coral red (regular expressions)
    
    case 'variable':
    case 'parameter':
      return '#9CDCFE'; // Light blue
    
    default:
      return '#D4D4D4'; // VS code default foreground
  }
}

/**
 * Format indentation visual guides
 * Returns count of indentation stops (e.g. 2 or 4 spaces) at start of string
 */
export function getIndentationGuideStops(line: string, tabSize: number): { leadingSpaces: number; guideStops: number } {
  const match = line.match(/^(\s+)/);
  if (!match) return { leadingSpaces: 0, guideStops: 0 };

  const rawSpace = match[1];
  let spaceCount = 0;
  for (let i = 0; i < rawSpace.length; i++) {
    if (rawSpace[i] === '\t') {
      spaceCount += tabSize;
    } else {
      spaceCount += 1;
    }
  }

  const guideStops = Math.floor(spaceCount / tabSize);
  return { leadingSpaces: spaceCount, guideStops };
}
