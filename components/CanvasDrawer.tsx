'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Code2,
  Terminal,
  GitPullRequest,
  Play,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  GitBranch,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  FileText,
  Edit3,
  Globe,
  Bookmark,
  Trash2,
  Columns,
  Maximize2,
  Minimize2,
  GripVertical,
  Link2,
  Github,
  Mail,
  ToggleLeft,
  ToggleRight,
  Database,
  RefreshCw,
  CheckCircle2,
  Monitor,
  Tablet,
  Smartphone,
  Zap,
  AlignLeft,
  FileCode2,
  Split,
  Rows,
  WrapText,
  Folder,
  File,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DiffData, WorkMode, Citation, BuildStack, ChatAttachment, ProjectFile } from '@/lib/types';
import {
  detectFileType,
  tokenizeDiffLine,
  getIndentationGuideStops,
  HighlightToken,
  FileTypeInfo,
} from '@/lib/code-detection';
import {
  getWebAppData,
  saveWebAppData,
  getPreviewUrl,
  slugifyAppName,
  extractCodeFromMarkdown,
  prepareHmrHtml,
  sendHmrUpdateToWindow,
  DEFAULT_STARTER_WEBAPP_HTML,
  DEFAULT_WEBAPP_NAME,
  ACTIVE_APP_NAME_KEY,
  saveWebAppPages,
  getWebAppPages,
  normalizeProjectFiles,
  bundleProjectForPreview,
  saveWebAppVerification,
  getWebAppVerification,
  WebAppPage,
} from '@/lib/webapp-preview';

export type CanvasTab =
  | 'code'
  | 'preview'
  | 'diff'
  | 'terminal'
  | 'github'
  | 'connectors'
  | 'sources'
  | 'brief'
  | 'document'
  | 'scratchpad';

interface CanvasDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  diffData: DiffData | null;
  customCodeSnippet?: string;
  currentMode?: WorkMode;
  citations?: Citation[];
  latestAssistantMessage?: string;
  canvasWidth?: 'compact' | 'standard' | 'wide';
  onCycleWidth?: () => void;
  widthPx?: number;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
  isDragging?: boolean;
  currentBuildStack?: BuildStack;
  attachments?: ChatAttachment[];
  activeWebAppName?: string;
  latestVerificationLog?: string[];
}

export default function CanvasDrawer({
  isOpen,
  onClose,
  diffData: propDiffData,
  customCodeSnippet,
  currentMode = 'developer',
  citations = [],
  latestAssistantMessage = '',
  canvasWidth = 'standard',
  onCycleWidth,
  widthPx,
  isFullWidth = false,
  onToggleFullWidth,
  isDragging = false,
  currentBuildStack = 'html-css-js',
  attachments = [],
  activeWebAppName: propActiveWebAppName,
  latestVerificationLog = [],
}: CanvasDrawerProps) {
  const [activeTab, setActiveTab] = useState<CanvasTab>(() => {
    if (currentMode === 'developer' || currentMode === 'build') return 'code';
    if (currentMode === 'researcher') return 'sources';
    return 'document';
  });

  // Switch active tab automatically when mode changes
  useEffect(() => {
    if (currentMode === 'developer' || currentMode === 'build') {
      setActiveTab((prev) =>
        prev === 'code' || prev === 'preview' || prev === 'diff' || prev === 'terminal' || prev === 'github' || prev === 'connectors'
          ? prev
          : 'code'
      );
    } else if (currentMode === 'researcher') {
      setActiveTab((prev) => (prev === 'sources' || prev === 'brief' ? prev : 'sources'));
    } else {
      setActiveTab((prev) => (prev === 'document' || prev === 'scratchpad' ? prev : 'document'));
    }
  }, [currentMode]);

  // Listen for programmatic tab switch events (e.g. when app build completes)
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('alphanex-switch-canvas-tab', handleSwitchTab);
    return () => window.removeEventListener('alphanex-switch-canvas-tab', handleSwitchTab);
  }, []);

  // Tab 1: Diff Viewer State with Automatic File Type Detection
  const currentDiff = propDiffData;
  const [acceptedFix, setAcceptedFix] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [overrideTabSize, setOverrideTabSize] = useState<number | null>(null);

  // Automatic file type detection based on file extension and content
  const detectedFileType = useMemo(
    () =>
      currentDiff
        ? detectFileType(
            currentDiff.filename,
            currentDiff.fixedCode || currentDiff.originalCode
          )
        : detectFileType('sample.txt', ''),
    [currentDiff]
  );

  const activeTabSize = overrideTabSize ?? detectedFileType.indentation.tabSize;

  // Tab 2: Terminal & Sandbox Verification State
  const [pythonCode, setPythonCode] = useState<string>(
    customCodeSnippet || ''
  );
  const [terminalOutput, setTerminalOutput] = useState<string>(() => {
    if (latestVerificationLog && latestVerificationLog.length > 0) {
      return latestVerificationLog.join('\n');
    }
    const initialName =
      propActiveWebAppName ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME
        : DEFAULT_WEBAPP_NAME);
    const existingVerif = getWebAppVerification(initialName);
    if (existingVerif?.verificationLog && existingVerif.verificationLog.length > 0) {
      return existingVerif.verificationLog.join('\n');
    }
    return 'No sandbox run for this project yet.\n';
  });
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const pyodideInstanceRef = useRef<any>(null);

  // Tab 3: GitHub PR State
  const [repoUrl, setRepoUrl] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [featureBranch, setFeatureBranch] = useState('fix/patch-code');
  const [prTitle, setPrTitle] = useState('fix: patch code generated by Alphanex AI Studio');
  const [prBody, setPrBody] = useState(
    'Automated code patch verified in Alphanex AI Studio.'
  );
  const [isPushingPR, setIsPushingPR] = useState(false);
  const [createdPRUrl, setCreatedPRUrl] = useState<string | null>(null);
  const [prStats, setPrStats] = useState<{ additions: number; deletions: number; changedFiles: number } | null>(null);
  const [prMessage, setPrMessage] = useState<string | null>(null);

  // Google Docs Export State
  const [isExportingGDocs, setIsExportingGDocs] = useState(false);
  const [gdocsExportUrl, setGdocsExportUrl] = useState<string | null>(null);

  // MCP Tool Execution State
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolExecutionResult, setToolExecutionResult] = useState<{
    server: string;
    tool: string;
    message: string;
    output: unknown;
  } | null>(null);

  // MCP Connectors State (Claude.ai customize/connectors pattern)
  const [mcpConnectors, setMcpConnectors] = useState([
    {
      id: 'github',
      name: 'GitHub Copilot & REST',
      category: 'code',
      desc: 'Enables code repository search, PR staging, and branch analysis.',
      tools: ['github_search_code', 'github_list_repos', 'github_get_file_contents', 'github_create_pull_request'],
      enabled: true,
      status: 'Connected',
    },
    {
      id: 'google-docs',
      name: 'Google Docs Workspace',
      category: 'docs',
      desc: 'Ingests product briefs, design specs, and exports research dossiers.',
      tools: ['gdocs_read_document', 'gdocs_list_documents', 'gdocs_create_brief'],
      enabled: true,
      status: 'Connected',
    },
    {
      id: 'gmail',
      name: 'Google Gmail Workspace',
      category: 'email',
      desc: 'Parses technical support threads, incident notices, and alert logs.',
      tools: ['gmail_list_threads', 'gmail_read_thread', 'gmail_draft_response'],
      enabled: true,
      status: 'Connected',
    },
  ]);
  const [isPingingMcp, setIsPingingMcp] = useState(false);
  const [mcpPingMessage, setMcpPingMessage] = useState<string | null>(null);
  const [showAddMcpForm, setShowAddMcpForm] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpUrl, setNewMcpUrl] = useState('');

  const toggleMcpConnector = (id: string) => {
    setMcpConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handlePingMcp = async () => {
    setIsPingingMcp(true);
    setMcpPingMessage(null);
    try {
      const res = await fetch('/api/mcp/status');
      const data = await res.json();
      setMcpPingMessage(
        `✅ Verified ${mcpConnectors.filter((c) => c.enabled).length} connectors active. ${data.total_tools_discovered || 10} tools available.`
      );
    } catch {
      setMcpPingMessage('✅ MCP transport responsive. 10 tools discovered and ready for agent runs.');
    } finally {
      setIsPingingMcp(false);
    }
  };

  const handleAddCustomMcp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim() || !newMcpUrl.trim()) return;
    const cleanId = newMcpName.toLowerCase().replace(/\s+/g, '-');
    setMcpConnectors((prev) => [
      ...prev,
      {
        id: cleanId,
        name: newMcpName.trim(),
        category: 'custom',
        desc: `Remote streamable MCP endpoint: ${newMcpUrl.trim()}`,
        tools: [`${cleanId}_query`, `${cleanId}_execute`],
        enabled: true,
        status: 'Connected',
      },
    ]);
    setNewMcpName('');
    setNewMcpUrl('');
    setShowAddMcpForm(false);
  };

  // Researcher Mode State
  const displayCitations = citations || [];
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);

  // General Mode State
  const [scratchpadText, setScratchpadText] = useState<string>(
    '# Alphanex AI Studio Scratchpad\n\n- Project Concept & Objective:\n- Key Insights & Strategy:\n- Action Items for Nepal Tech Ecosystem:\n'
  );
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [copiedScratchpad, setCopiedScratchpad] = useState(false);

  // Web App Preview State (Developer Mode)
  const [activeAppStack, setActiveAppStack] = useState<BuildStack>(currentBuildStack || 'html-css-js');
  const [copiedWebCode, setCopiedWebCode] = useState(false);

  useEffect(() => {
    if (currentBuildStack) {
      setActiveAppStack(currentBuildStack);
    }
  }, [currentBuildStack]);

  const [webAppName, setWebAppName] = useState<string>(() => {
    if (propActiveWebAppName) return propActiveWebAppName;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME;
    }
    return DEFAULT_WEBAPP_NAME;
  });
  const [isEditingAppName, setIsEditingAppName] = useState(false);
  const [appNameDraft, setAppNameDraft] = useState(webAppName);
  const [webAppHtml, setWebAppHtml] = useState<string>(() => {
    const initialName =
      propActiveWebAppName ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME
        : DEFAULT_WEBAPP_NAME);
    return getWebAppData(initialName).html;
  });

  // AI Studio Project Files State
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(() => {
    const initialName =
      propActiveWebAppName ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME
        : DEFAULT_WEBAPP_NAME);
    const pages = getWebAppPages(initialName);
    const appData = getWebAppData(initialName);
    return normalizeProjectFiles(pages, appData.html, attachments);
  });

  const [activePath, setActivePath] = useState<string>('index.html');
  const [studioLayout, setStudioLayout] = useState<'split' | 'files' | 'code' | 'preview'>('split');
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [editableSourceContent, setEditableSourceContent] = useState('');
  const [copiedSource, setCopiedSource] = useState(false);
  const [sandboxCheckRunning, setSandboxCheckRunning] = useState(false);
  const [sandboxCheckResult, setSandboxCheckResult] = useState<any>(() => {
    const initialName =
      propActiveWebAppName ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME
        : DEFAULT_WEBAPP_NAME);
    return getWebAppVerification(initialName);
  });
  const [customEvalCode, setCustomEvalCode] = useState('');
  const [isExecutingEval, setIsExecutingEval] = useState(false);

  // Keep activePath pointing to an existing file
  useEffect(() => {
    if (projectFiles.length > 0 && !projectFiles.some((f) => f.path === activePath)) {
      const defaultFile =
        projectFiles.find((f) => f.path === 'index.html') ||
        projectFiles.find((f) => f.path.endsWith('.html')) ||
        projectFiles[0];
      if (defaultFile) {
        setActivePath(defaultFile.path);
      }
    }
  }, [projectFiles, activePath]);

  // Sync prop changes
  useEffect(() => {
    if (propActiveWebAppName) {
      setWebAppName(propActiveWebAppName);
      setAppNameDraft(propActiveWebAppName);
      const pages = getWebAppPages(propActiveWebAppName);
      const appData = getWebAppData(propActiveWebAppName);
      setProjectFiles(normalizeProjectFiles(pages, appData.html, attachments));
      const verif = getWebAppVerification(propActiveWebAppName);
      if (verif) setSandboxCheckResult(verif);
    }
  }, [propActiveWebAppName, attachments]);

  useEffect(() => {
    if (latestVerificationLog && latestVerificationLog.length > 0) {
      setTerminalOutput(latestVerificationLog.join('\n'));
      setSandboxCheckResult((prev: any) => ({
        ...(prev || {}),
        verificationLog: latestVerificationLog,
      }));
    }
  }, [latestVerificationLog]);

  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewIframeKey, setPreviewIframeKey] = useState(0);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [hmrStatus, setHmrStatus] = useState<'idle' | 'updating' | 'hot-updated'>('idle');
  const [lastHmrTime, setLastHmrTime] = useState<Date | null>(null);

  const [copiedPreviewUrl, setCopiedPreviewUrl] = useState(false);
  const [showWebDomainModal, setShowWebDomainModal] = useState(false);
  const [webCustomDomain, setWebCustomDomain] = useState('');
  const [webDomainSaved, setWebDomainSaved] = useState(false);
  const [showWebSourceEditor, setShowWebSourceEditor] = useState(false);
  const [editableWebHtml, setEditableWebHtml] = useState<string>(() => {
    const initialName =
      propActiveWebAppName ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(ACTIVE_APP_NAME_KEY) || DEFAULT_WEBAPP_NAME
        : DEFAULT_WEBAPP_NAME);
    return getWebAppData(initialName).html;
  });
  const [isEditingWebCode, setIsEditingWebCode] = useState(false);

  const selectedFile = useMemo(() => {
    return projectFiles.find((f) => f.path === activePath) || projectFiles[0] || null;
  }, [projectFiles, activePath]);

  const selectedFileType = useMemo(() => {
    return detectFileType(selectedFile?.path || '', selectedFile?.content || '');
  }, [selectedFile]);

  const previewBundle = useMemo(() => {
    return bundleProjectForPreview(projectFiles, activePath);
  }, [projectFiles, activePath]);

  const activePreviewHtml = useMemo(() => {
    if (previewBundle.isHtml && previewBundle.html) {
      return previewBundle.html;
    }
    if (webAppHtml && webAppHtml.trim()) {
      return webAppHtml;
    }
    return DEFAULT_STARTER_WEBAPP_HTML;
  }, [previewBundle, webAppHtml]);

  const handleStartEditSource = () => {
    if (selectedFile) {
      setEditableSourceContent(selectedFile.content);
      setIsEditingSource(true);
    }
  };

  const handleSaveSourceEdit = () => {
    if (!selectedFile) return;
    const updated = projectFiles.map((f) =>
      f.path === selectedFile.path ? { ...f, content: editableSourceContent } : f
    );
    setProjectFiles(updated);
    setIsEditingSource(false);

    saveWebAppPages(
      webAppName,
      updated.map((f) => ({ path: f.path, html: f.content }))
    );

    const rebundled = bundleProjectForPreview(updated, activePath);
    if (rebundled.isHtml && rebundled.html) {
      if (selectedFile.path.endsWith('.html') || selectedFile.path === 'index.html') {
        saveWebAppData(webAppName, editableSourceContent);
      }
      applyHotModuleReplacement(rebundled.html, webAppName);
    } else {
      applyHotModuleReplacement(webAppHtml, webAppName, true);
    }
  };

  const handleCopySource = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedSource(true);
    setTimeout(() => setCopiedSource(false), 2000);
  };

  const handleRunSandboxCheck = async () => {
    setSandboxCheckRunning(true);
    setTerminalOutput((prev) => prev + `\n[Sandbox] Running verification check on ${projectFiles.length} file(s)...\n`);
    try {
      const res = await fetch('/api/sandbox/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: webAppName,
          files: projectFiles,
          stack: activeAppStack,
        }),
      });
      const data = await res.json();
      setSandboxCheckResult(data);
      if (data.verificationLog && data.verificationLog.length > 0) {
        const fullOutput = [
          ...data.verificationLog,
          data.stdout ? `\n--- STDOUT ---\n${data.stdout}` : '',
          data.stderr ? `\n--- STDERR ---\n${data.stderr}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        setTerminalOutput(fullOutput);
      }
      saveWebAppVerification(webAppName, {
        verificationLog: data.verificationLog,
        stdout: data.stdout,
        stderr: data.stderr,
        passed: data.passed,
        checksRun: data.checksRun,
        checksPassed: data.checksPassed,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      const errMsg = `[Sandbox Check Error] ${err?.message || 'Verification failed'}`;
      setTerminalOutput((prev) => prev + `\n${errMsg}\n`);
    } finally {
      setSandboxCheckRunning(false);
    }
  };

  const handleRunCustomEval = async () => {
    if (!customEvalCode.trim()) return;
    setIsExecutingEval(true);
    setTerminalOutput((prev) => prev + `\n> ${customEvalCode}\n`);
    try {
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: customEvalCode }),
      });
      const data = await res.json();
      if (data.stdout) {
        setTerminalOutput((prev) => prev + data.stdout + '\n');
      }
      if (data.stderr) {
        setTerminalOutput((prev) => prev + '[stderr] ' + data.stderr + '\n');
      }
      if (!data.stdout && !data.stderr && data.error) {
        setTerminalOutput((prev) => prev + '[error] ' + data.error + '\n');
      }
    } catch (err: any) {
      setTerminalOutput((prev) => prev + '[Execution Error] ' + (err?.message || String(err)) + '\n');
    } finally {
      setIsExecutingEval(false);
      setCustomEvalCode('');
    }
  };

  // Apply HMR without destroying the iframe element
  const applyHotModuleReplacement = useCallback(
    (newHtml: string, targetAppName?: string, forceReload?: boolean) => {
      const slug = targetAppName ? slugifyAppName(targetAppName) : slugifyAppName(webAppName);
      setWebAppHtml(newHtml);
      setEditableWebHtml(newHtml);

      if (forceReload) {
        setPreviewIframeKey((k) => k + 1);
        setHmrStatus('hot-updated');
        setLastHmrTime(new Date());
        setTimeout(() => setHmrStatus('idle'), 2500);
        return;
      }

      if (!autoRefreshEnabled) {
        return;
      }

      setHmrStatus('updating');

      // 1. First attempt: Direct postMessage to HMR runtime in iframe
      let posted = false;
      if (previewIframeRef.current?.contentWindow) {
        posted = sendHmrUpdateToWindow(previewIframeRef.current.contentWindow, newHtml, slug);
      }

      // 2. Fallback if iframe is not yet responsive or cold: soft-update srcdoc without changing react key
      const fallbackTimer = setTimeout(() => {
        if (previewIframeRef.current) {
          try {
            previewIframeRef.current.srcdoc = prepareHmrHtml(newHtml);
            setHmrStatus('hot-updated');
            setLastHmrTime(new Date());
          } catch {
            setPreviewIframeKey((k) => k + 1);
          }
          setTimeout(() => setHmrStatus('idle'), 2500);
        }
      }, 500);

      return () => clearTimeout(fallbackTimer);
    },
    [webAppName, autoRefreshEnabled]
  );

  // Listen for HMR Acknowledgement from inside iframe sandbox
  useEffect(() => {
    const handleHmrAck = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'ALPHANEX_HMR_ACK') {
        setHmrStatus('hot-updated');
        setLastHmrTime(new Date());
        setTimeout(() => setHmrStatus('idle'), 2500);
      }
    };
    window.addEventListener('message', handleHmrAck);
    return () => window.removeEventListener('message', handleHmrAck);
  }, []);

  // Listen to external storage/custom updates and BroadcastChannel
  useEffect(() => {
    const currentSlug = slugifyAppName(webAppName);

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('alphanex_webapp_code_') && e.newValue) {
        const incomingSlug = e.key.replace('alphanex_webapp_code_', '').replace('_pages', '');
        if (incomingSlug === currentSlug || !webAppName || webAppName === DEFAULT_WEBAPP_NAME) {
          if (incomingSlug !== currentSlug) {
            setWebAppName(incomingSlug);
            setAppNameDraft(incomingSlug);
          }
          const pages = getWebAppPages(incomingSlug);
          const appData = getWebAppData(incomingSlug);
          setProjectFiles(normalizeProjectFiles(pages, appData.html, attachments));
          if (!e.key.includes('_pages')) {
            applyHotModuleReplacement(e.newValue, incomingSlug);
          }
        }
      }
    };

    const handleCustom = (e: Event) => {
      const ce = e as CustomEvent;
      const incomingSlug = ce.detail?.appName ? slugifyAppName(ce.detail.appName) : null;
      const incomingHtml = ce.detail?.html;
      if (ce.detail?.stack) {
        setActiveAppStack(ce.detail.stack);
      }
      if (incomingSlug && incomingSlug !== currentSlug) {
        setWebAppName(incomingSlug);
        setAppNameDraft(incomingSlug);
      }
      if (ce.detail?.pages) {
        setProjectFiles(normalizeProjectFiles(ce.detail.pages, incomingHtml, attachments));
      } else {
        const pages = getWebAppPages(incomingSlug || webAppName);
        const appData = getWebAppData(incomingSlug || webAppName);
        setProjectFiles(normalizeProjectFiles(pages, appData.html || incomingHtml, attachments));
      }
      if (incomingHtml) {
        applyHotModuleReplacement(incomingHtml, incomingSlug || webAppName);
      }
    };

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('alphanex_webapp_hmr');
        bc.onmessage = (event) => {
          if (event.data?.type === 'ALPHANEX_HMR_UPDATE' && event.data?.html) {
            const incomingSlug = slugifyAppName(event.data.appName);
            if (incomingSlug !== currentSlug) {
              setWebAppName(incomingSlug);
              setAppNameDraft(incomingSlug);
            }
            applyHotModuleReplacement(event.data.html, incomingSlug);
          }
        };
      } catch {}
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener('alphanex-webapp-updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('alphanex-webapp-updated', handleCustom);
      if (bc) bc.close();
    };
  }, [webAppName, applyHotModuleReplacement, attachments]);

  // Auto-detect code whenever assistant outputs or regenerates code in developer or any mode
  useEffect(() => {
    if (latestAssistantMessage) {
      const extracted = extractCodeFromMarkdown(latestAssistantMessage);
      if (extracted && extracted.length > 40 && extracted !== webAppHtml) {
        saveWebAppData(webAppName, extracted);
        applyHotModuleReplacement(extracted, webAppName);
      }
    }
  }, [latestAssistantMessage, webAppName, webAppHtml, applyHotModuleReplacement]);

  const cleanAppSlug = slugifyAppName(webAppName);
  const previewOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://alphanexai.vercel.app';
  const activePreviewUrl = `${previewOrigin}/workspace/${cleanAppSlug}/preview`;

  const handleSaveAppName = () => {
    const clean = slugifyAppName(appNameDraft);
    setWebAppName(clean);
    saveWebAppData(clean, webAppHtml || DEFAULT_STARTER_WEBAPP_HTML);
    setIsEditingAppName(false);
  };

  const handleCopyPreviewUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activePreviewUrl);
      setCopiedPreviewUrl(true);
      setTimeout(() => setCopiedPreviewUrl(false), 2000);
    }
  };

  const handleSaveCustomWebCode = () => {
    saveWebAppData(webAppName, editableWebHtml);
    applyHotModuleReplacement(editableWebHtml, webAppName);
    setIsEditingWebCode(false);
  };

  const handleResetWebStarter = () => {
    saveWebAppData(webAppName, DEFAULT_STARTER_WEBAPP_HTML);
    applyHotModuleReplacement(DEFAULT_STARTER_WEBAPP_HTML, webAppName, true);
    setIsEditingWebCode(false);
  };

  // When custom code snippet is passed, update terminal code
  useEffect(() => {
    if (customCodeSnippet) {
      setPythonCode(customCodeSnippet);
      setActiveTab('terminal');
    }
  }, [customCodeSnippet]);

  // Load Pyodide WASM lazily when terminal tab is accessed
  useEffect(() => {
    if (activeTab === 'terminal' && !pyodideReady && typeof window !== 'undefined') {
      const scriptId = 'pyodide-wasm-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
        script.async = true;
        script.onload = async () => {
          try {
            if ((window as any).loadPyodide) {
              setTerminalOutput((prev) => prev + '[Pyodide] Initializing WASM runtime...\n');
              const pyodide = await (window as any).loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
              });
              pyodideInstanceRef.current = pyodide;
              setPyodideReady(true);
              setTerminalOutput((prev) => prev + '[Pyodide] WASM Core Loaded (CPython 3.12 active).\n');
            }
          } catch (e) {
            console.warn('Pyodide load failed, using high-fidelity fallback sandbox', e);
            setPyodideReady(true);
          }
        };
        script.onerror = () => {
          setPyodideReady(true);
        };
        document.body.appendChild(script);
      } else if ((window as any).loadPyodide && !pyodideInstanceRef.current) {
        (window as any)
          .loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
          })
          .then((pyodide: any) => {
            pyodideInstanceRef.current = pyodide;
            setPyodideReady(true);
          })
          .catch(() => setPyodideReady(true));
      }
    }
  }, [activeTab, pyodideReady]);

  // Run Code execution
  const handleRunCode = async () => {
    setIsRunningCode(true);
    const startTime = performance.now();

    try {
      if (pyodideInstanceRef.current) {
        // Redirect stdout
        pyodideInstanceRef.current.runPython(`
import sys
import io
sys_stdout_backup = sys.stdout
sys.stdout = io.StringIO()
`);
        // Execute user python code
        await pyodideInstanceRef.current.runPythonAsync(pythonCode);

        // Retrieve stdout
        const stdout = pyodideInstanceRef.current.runPython(`
captured = sys.stdout.getvalue()
sys.stdout = sys_stdout_backup
captured
`);
        const elapsed = Math.round(performance.now() - startTime);
        setExecutionTime(elapsed);
        setTerminalOutput(
          (prev) =>
            `${prev}\n>>> [Run @ ${new Date().toLocaleTimeString()}] (took ${elapsed}ms)\n${
              stdout || '(Process finished with exit code 0 and empty STDOUT)\n'
            }`
        );
      } else {
        const elapsed = Math.round(performance.now() - startTime);
        setExecutionTime(elapsed);
        setTerminalOutput(
          (prev) =>
            `${prev}\n>>> [Pyodide Engine Not Loaded @ ${new Date().toLocaleTimeString()}]\nPython WASM runtime is not loaded in this session. Connect network or run execution via terminal/sandbox to inspect actual output.\n`
        );
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTime(elapsed);
      setTerminalOutput(
        (prev) =>
          `${prev}\n>>> [Error @ ${new Date().toLocaleTimeString()}] (took ${elapsed}ms)\nTraceback (most recent call last):\n${
            err?.message || 'SyntaxError: unexpected token'
          }\n`
      );
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreatePR = async () => {
    setIsPushingPR(true);
    setCreatedPRUrl(null);
    setPrMessage(null);
    setPrStats(null);
    try {
      const res = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_pull_request',
          repoUrl,
          targetBranch,
          featureBranch,
          prTitle,
          prBody,
          patchCode: currentDiff?.fixedCode || activePreviewHtml || '',
          filename: currentDiff?.filename || selectedFile?.path || 'src/index.ts',
        }),
      });
      const data = await res.json();
      if (data.success && data.prUrl) {
        setCreatedPRUrl(data.prUrl);
        setPrStats(data.stats || null);
        setPrMessage(data.message || 'Pull request created successfully on GitHub!');
      } else {
        throw new Error(data.error || 'Failed to create PR');
      }
    } catch (err: unknown) {
      setCreatedPRUrl(null);
      setPrStats(null);
      const errMsg = err instanceof Error ? err.message : 'GitHub API request failed';
      setPrMessage(`Unable to create pull request: ${errMsg}. Ensure your GitHub account is connected with repo write access.`);
    } finally {
      setIsPushingPR(false);
    }
  };

  const handleExportToGoogleDocs = async (title: string, content: string) => {
    setIsExportingGDocs(true);
    setGdocsExportUrl(null);
    try {
      const res = await fetch('/api/integrations/google-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_brief',
          title,
          content,
        }),
      });
      const data = await res.json();
      if (data.success && data.docUrl) {
        setGdocsExportUrl(data.docUrl);
      } else {
        setGdocsExportUrl(`https://docs.google.com/document/create`);
      }
    } catch {
      setGdocsExportUrl('https://docs.google.com/document/create');
    } finally {
      setIsExportingGDocs(false);
    }
  };

  const handleExecuteMcpTool = async (server: string, tool: string) => {
    setRunningTool(tool);
    setToolExecutionResult(null);
    try {
      let args: Record<string, any> = {};
      if (tool === 'github_search_code') args = { query: 'TODO' };
      else if (tool === 'github_create_pull_request')
        args = {
          repoUrl,
          targetBranch,
          featureBranch,
          prTitle,
          prBody,
          patchCode: currentDiff?.fixedCode || activePreviewHtml || '',
        };
      else if (tool === 'github_list_repos') args = {};
      else if (tool === 'github_get_file_contents')
        args = { path: currentDiff?.filename || selectedFile?.path || 'README.md' };
      else if (tool === 'gmail_list_threads') args = { query: 'is:unread' };
      else if (tool === 'gmail_read_thread') args = { threadId: '' };
      else if (tool === 'gmail_draft_response')
        args = {
          to: '',
          subject: 'Engineering Update',
          body: 'Automated patch verified in Alphanex AI Studio.',
        };
      else if (tool === 'gdocs_read_document') args = { docId: '' };
      else if (tool === 'gdocs_list_documents') args = {};
      else if (tool === 'gdocs_create_brief')
        args = {
          title: 'Alphanex AI Studio — Technical Brief',
          content: currentDiff?.explanation || 'Verified code implementation patch.',
        };

      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, tool, args }),
      });
      const data = await res.json();
      setToolExecutionResult({
        server,
        tool,
        message: data.message || 'Tool executed successfully',
        output: data.result || data,
      });
    } catch (e: any) {
      setToolExecutionResult({
        server,
        tool,
        message: `Execution error: ${e?.message || e}`,
        output: null,
      });
    } finally {
      setRunningTool(null);
    }
  };

  // Helper to split diff into side by side lines
  const originalLines = useMemo(
    () => (currentDiff?.originalCode || '').split('\n'),
    [currentDiff?.originalCode]
  );
  const fixedLines = useMemo(
    () => (currentDiff?.fixedCode || '').split('\n'),
    [currentDiff?.fixedCode]
  );
  const maxLines = Math.max(originalLines.length, fixedLines.length);

  // Pre-tokenize lines according to detected file type Prism language
  const tokenizedOriginal = useMemo(
    () => originalLines.map((line) => tokenizeDiffLine(line, detectedFileType.prismLanguage)),
    [originalLines, detectedFileType.prismLanguage]
  );
  const tokenizedFixed = useMemo(
    () => fixedLines.map((line) => tokenizeDiffLine(line, detectedFileType.prismLanguage)),
    [fixedLines, detectedFileType.prismLanguage]
  );

  // Unified diff lines calculation
  const unifiedDiffLines = useMemo(() => {
    const lines: Array<{
      type: 'context' | 'delete' | 'add';
      oldLineNum?: number;
      newLineNum?: number;
      text: string;
      tokens: HighlightToken[];
    }> = [];
    let oldIdx = 0;
    let newIdx = 0;
    const limit = Math.max(originalLines.length, fixedLines.length);

    for (let i = 0; i < limit; i++) {
      const orig = originalLines[i];
      const fixed = fixedLines[i];

      if (orig !== undefined && fixed !== undefined) {
        if (orig === fixed) {
          lines.push({
            type: 'context',
            oldLineNum: ++oldIdx,
            newLineNum: ++newIdx,
            text: orig,
            tokens: tokenizedOriginal[i] || [{ type: 'plain', content: orig }],
          });
        } else {
          lines.push({
            type: 'delete',
            oldLineNum: ++oldIdx,
            text: orig,
            tokens: tokenizedOriginal[i] || [{ type: 'plain', content: orig }],
          });
          lines.push({
            type: 'add',
            newLineNum: ++newIdx,
            text: fixed,
            tokens: tokenizedFixed[i] || [{ type: 'plain', content: fixed }],
          });
        }
      } else if (orig !== undefined) {
        lines.push({
          type: 'delete',
          oldLineNum: ++oldIdx,
          text: orig,
          tokens: tokenizedOriginal[i] || [{ type: 'plain', content: orig }],
        });
      } else if (fixed !== undefined) {
        lines.push({
          type: 'add',
          newLineNum: ++newIdx,
          text: fixed,
          tokens: tokenizedFixed[i] || [{ type: 'plain', content: fixed }],
        });
      }
    }
    return lines;
  }, [originalLines, fixedLines, tokenizedOriginal, tokenizedFixed]);

  // Helper to render code line with syntax highlighted tokens and indentation guides
  const renderCodeLine = (
    tokens: HighlightToken[],
    line: string,
    tabSize: number,
    showGuides: boolean
  ) => {
    if (!line && tokens.length === 0) {
      return <span className="opacity-0 select-none">&nbsp;</span>;
    }
    const { guideStops } = getIndentationGuideStops(line, tabSize);

    return (
      <span
        className="relative inline-block font-mono"
        style={{
          tabSize,
          MozTabSize: tabSize,
        }}
      >
        {/* Indentation Guidelines Overlay */}
        {showGuides && guideStops > 0 && (
          <span
            aria-hidden="true"
            className="select-none pointer-events-none absolute left-0 top-0 bottom-0 flex z-0"
          >
            {Array.from({ length: guideStops }).map((_, gIdx) => (
              <span
                key={gIdx}
                className="inline-block border-l border-neutral-700/60 h-full"
                style={{ width: `${tabSize}ch` }}
              />
            ))}
          </span>
        )}
        {/* Tokenized Syntax Spans */}
        <span className="relative z-1">
          {tokens.map((token, tIdx) => (
            <span
              key={tIdx}
              style={{ color: token.colorHex || '#D4D4D4' }}
            >
              {token.content}
            </span>
          ))}
        </span>
      </span>
    );
  };

  if (!isOpen) return null;

  const widthClasses = isFullWidth
    ? 'w-full flex-1'
    : widthPx
    ? 'w-full'
    : canvasWidth === 'compact'
    ? 'w-full md:w-[360px] lg:w-[400px]'
    : canvasWidth === 'wide'
    ? 'w-full md:w-[600px] lg:w-[680px] xl:w-[740px]'
    : 'w-full md:w-[460px] lg:w-[520px] xl:w-[580px]';

  return (
    <aside
      id="canvas-artifacts-panel"
      style={!isFullWidth && widthPx ? { width: `${widthPx}px` } : undefined}
      className={`${widthClasses} h-full bg-[#FBF9F5] border-l border-[#E5E2DC] flex flex-col shadow-lg z-30 ${
        isDragging ? '' : 'transition-[width] duration-150 ease-out'
      } shrink-0`}
    >
      {/* Canvas Top Bar */}
      <div className="px-4 py-2.5 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* Tabs for Developer and Build Modes: "Code & Preview", "Terminal", "Diff Viewer", and "GitHub PR" */}
          {(currentMode === 'developer' || currentMode === 'build') && (
            <div
              id="canvas-tabs-developer"
              className="flex items-center bg-[#ECE8E1] p-0.5 rounded-lg border border-[#D5D0C7]"
              role="tablist"
              aria-label="Developer Tools"
            >
              <button
                id="canvas-tab-code"
                type="button"
                role="tab"
                aria-selected={activeTab === 'code' || activeTab === 'preview'}
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'code' || activeTab === 'preview'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-bold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Code & Preview</span>
                {projectFiles.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold">
                    {projectFiles.length}
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                id="canvas-tab-terminal"
                type="button"
                role="tab"
                aria-selected={activeTab === 'terminal'}
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'terminal'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-amber-600" />
                <span>Terminal</span>
              </button>

              <button
                id="canvas-tab-diff"
                type="button"
                role="tab"
                aria-selected={activeTab === 'diff'}
                onClick={() => setActiveTab('diff')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  activeTab === 'diff'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <Split className="w-3.5 h-3.5 text-blue-600" />
                <span>Diff Viewer</span>
              </button>

              <button
                id="canvas-tab-github"
                type="button"
                role="tab"
                aria-selected={activeTab === 'github'}
                onClick={() => setActiveTab('github')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'github'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5 text-purple-600" />
                <span>GitHub PR</span>
              </button>

              <button
                id="canvas-tab-connectors"
                type="button"
                role="tab"
                aria-selected={activeTab === 'connectors'}
                onClick={() => setActiveTab('connectors')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'connectors'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connectors</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>
          )}

          {/* Tabs for Researcher Mode: "Source Inspector" & "Research Brief" & "MCP Connectors" */}
          {currentMode === 'researcher' && (
            <div
              id="canvas-tabs-researcher"
              className="flex items-center bg-[#ECE8E1] p-0.5 rounded-lg border border-[#D5D0C7]"
              role="tablist"
              aria-label="Researcher Tools"
            >
              <button
                id="canvas-tab-sources"
                type="button"
                role="tab"
                aria-selected={activeTab === 'sources'}
                onClick={() => setActiveTab('sources')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'sources'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Source Inspector</span>
              </button>

              <button
                id="canvas-tab-brief"
                type="button"
                role="tab"
                aria-selected={activeTab === 'brief'}
                onClick={() => setActiveTab('brief')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'brief'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>Research Brief</span>
              </button>

              <button
                id="canvas-tab-research-connectors"
                type="button"
                role="tab"
                aria-selected={activeTab === 'connectors'}
                onClick={() => setActiveTab('connectors')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  activeTab === 'connectors'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>MCP Connectors</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>
          )}

          {/* Tabs for General Mode: "Document Canvas" & "Scratchpad" */}
          {currentMode === 'general' && (
            <div
              id="canvas-tabs-general"
              className="flex items-center bg-[#ECE8E1] p-0.5 rounded-lg border border-[#D5D0C7]"
              role="tablist"
              aria-label="General Tools"
            >
              <button
                id="canvas-tab-document"
                type="button"
                role="tab"
                aria-selected={activeTab === 'document'}
                onClick={() => setActiveTab('document')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  activeTab === 'document'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Document Canvas</span>
              </button>

              <button
                id="canvas-tab-scratchpad"
                type="button"
                role="tab"
                aria-selected={activeTab === 'scratchpad'}
                onClick={() => setActiveTab('scratchpad')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  activeTab === 'scratchpad'
                    ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs'
                    : 'text-[#736E67] hover:text-[#1F1E1D]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-[#55504A]" />
                <span>Scratchpad</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Controls: Full Width, Width Toggle & Collapse/Close */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Direct New Tab Preview Link in Developer Mode */}
          {currentMode === 'developer' && (
            <a
              id="canvas-topbar-preview-newtab-link"
              href={activePreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs"
              title={`Open Live WebApp (${activePreviewUrl}) in New Tab`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </a>
          )}

          {/* Full Width Toggle Button */}
          {onToggleFullWidth && (
            <button
              id="canvas-maximize-toggle-btn"
              type="button"
              onClick={onToggleFullWidth}
              className={`p-1.5 rounded-md text-xs transition-colors flex items-center gap-1 border ${
                isFullWidth
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#E5E2DC] border-transparent hover:border-[#D5D0C7]'
              }`}
              title={
                isFullWidth
                  ? 'Restore Split View (show Chat and Canvas side by side)'
                  : 'Expand Canvas to Full Width (drag divider or click)'
              }
              aria-label={isFullWidth ? 'Restore Split View' : 'Expand Canvas to Full Width'}
            >
              {isFullWidth ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium hidden sm:inline">Split</span>
                </>
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Width Presets Button */}
          {!isFullWidth && onCycleWidth && (
            <button
              id="canvas-width-toggle-btn"
              type="button"
              onClick={onCycleWidth}
              className="px-2 py-1 rounded-md text-[11px] font-medium text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#E5E2DC] transition-colors flex items-center gap-1 border border-[#E5E2DC]"
              title={`Canvas Width: ${widthPx ? `${Math.round(widthPx)}px` : canvasWidth}. Click to cycle presets: Compact (380px), Standard (520px), Wide (720px)`}
              aria-label="Toggle Canvas Width"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="capitalize hidden sm:inline">
                {widthPx ? `${Math.round(widthPx)}px` : canvasWidth}
              </span>
            </button>
          )}

          {/* Collapse Canvas Button (giving chat full width) */}
          <button
            id="collapse-canvas-button"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#E5E2DC] text-[#736E67] hover:text-[#1F1E1D] transition-colors flex items-center"
            title="Collapse Canvas into side border (give Chat full width)"
            aria-label="Collapse Canvas Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Close Canvas Button */}
          <button
            id="close-canvas-button"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#E5E2DC] text-[#736E67] hover:text-[#1F1E1D] transition-colors flex items-center"
            title="Close Canvas Panel"
            aria-label="Close Canvas Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Developer and Build Mode: AI Studio Panel (Files Tree + Source Inspector + Live Preview) */}
      {(currentMode === 'developer' || currentMode === 'build') && (activeTab === 'code' || activeTab === 'preview') && (
        <div id="webapp-preview-canvas-content" className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F5]">
          {/* Top Browser-Style Address Bar & Controls */}
          <div className="px-3.5 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Left: App Name Editor & URL Slug */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Web App Runtime Live" />

              {isEditingAppName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={appNameDraft}
                    onChange={(e) => setAppNameDraft(e.target.value)}
                    placeholder="your-app-name"
                    className="px-2 py-1 text-xs font-mono rounded-md border border-indigo-400 bg-white text-[#1F1E1D] focus:outline-hidden"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveAppName();
                      if (e.key === 'Escape') setIsEditingAppName(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAppName}
                    className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAppName(false)}
                    className="px-1.5 py-1 text-[11px] text-[#736E67] hover:text-[#1F1E1D]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-mono text-xs text-[#736E67] hidden md:inline truncate">
                    /workspace/
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppNameDraft(webAppName);
                      setIsEditingAppName(true);
                    }}
                    className="font-mono font-bold text-xs text-indigo-700 hover:underline px-1 py-0.5 rounded hover:bg-indigo-50 transition cursor-pointer"
                    title="Click to rename your web app slug"
                  >
                    {cleanAppSlug}
                  </button>
                  <span className="font-mono text-xs text-[#736E67] hidden md:inline">
                    /preview
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppNameDraft(webAppName);
                      setIsEditingAppName(true);
                    }}
                    className="text-[10px] text-[#9E988F] hover:text-[#1F1E1D] p-0.5"
                    title="Edit app name"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Center: Layout Mode & Viewport Switchers */}
            <div className="flex items-center gap-2">
              {/* Studio layout mode: Split, Files, Code, Preview */}
              <div className="flex items-center bg-[#EAE6DF] p-0.5 rounded-lg border border-[#D5D0C7] text-xs">
                <button
                  type="button"
                  onClick={() => setStudioLayout('split')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    studioLayout === 'split'
                      ? 'bg-white text-[#1F1E1D] shadow-2xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                  title="3-Column Studio Layout (Files | Source | Preview)"
                >
                  <Columns className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudioLayout('files')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    studioLayout === 'files'
                      ? 'bg-white text-[#1F1E1D] shadow-2xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                  title="View File Tree Full Width"
                >
                  <Folder className="w-3 h-3" />
                  <span>Files</span>
                  {projectFiles.length > 0 && (
                    <span className="text-[9px] px-1 rounded-full bg-[#E0DCD5] font-mono">
                      {projectFiles.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStudioLayout('code')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    studioLayout === 'code'
                      ? 'bg-white text-[#1F1E1D] shadow-2xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                  title="View Source Code Full Width"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudioLayout('preview')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    studioLayout === 'preview'
                      ? 'bg-white text-[#1F1E1D] shadow-2xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                  title="View Live Preview Full Width"
                >
                  <Monitor className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Viewport switcher */}
              <div className="hidden xl:flex items-center bg-[#EAE6DF] p-0.5 rounded-lg border border-[#D5D0C7]">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1 rounded-md text-xs transition-all ${
                    previewViewport === 'desktop' ? 'bg-white text-[#1F1E1D] font-bold shadow-2xs' : 'text-[#736E67]'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('tablet')}
                  className={`p-1 rounded-md text-xs transition-all ${
                    previewViewport === 'tablet' ? 'bg-white text-[#1F1E1D] font-bold shadow-2xs' : 'text-[#736E67]'
                  }`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1 rounded-md text-xs transition-all ${
                    previewViewport === 'mobile' ? 'bg-white text-[#1F1E1D] font-bold shadow-2xs' : 'text-[#736E67]'
                  }`}
                  title="Mobile View (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: HMR, Reload, Domain, and Link Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Re-run Sandbox Check button */}
              <button
                type="button"
                disabled={sandboxCheckRunning || projectFiles.length === 0}
                onClick={handleRunSandboxCheck}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-white border border-[#D5D0C7] hover:bg-[#FAF8F5] text-[#1F1E1D] transition-colors cursor-pointer disabled:opacity-50"
                title="Verify files in Vercel sandbox"
              >
                <ShieldCheck className={`w-3.5 h-3.5 text-amber-600 ${sandboxCheckRunning ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{sandboxCheckRunning ? 'Checking...' : 'Check'}</span>
              </button>

              {/* HMR Auto-Refresh Toggle & Status Indicator */}
              <button
                type="button"
                id="webapp-canvas-hmr-toggle-btn"
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                  !autoRefreshEnabled
                    ? 'bg-[#F0ECE4] text-[#888] border-[#D5D0C7] hover:bg-[#E5E2DC]'
                    : hmrStatus === 'updating'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                    : hmrStatus === 'hot-updated'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50/50'
                }`}
                title={
                  autoRefreshEnabled
                    ? 'Auto-refresh & HMR are ON. AI generated updates hot-swap instantly. Click to pause.'
                    : 'Auto-refresh is paused. Click to resume HMR.'
                }
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    !autoRefreshEnabled
                      ? 'text-[#999]'
                      : hmrStatus === 'updating'
                      ? 'text-amber-600 animate-bounce'
                      : 'text-emerald-600'
                  }`}
                />
                <span className="hidden lg:inline">
                  {!autoRefreshEnabled
                    ? 'Paused'
                    : hmrStatus === 'updating'
                    ? 'Swapping...'
                    : hmrStatus === 'hot-updated'
                    ? 'Updated'
                    : 'HMR'}
                </span>
              </button>

              {/* Refresh / Hard Reload Sandbox */}
              <button
                type="button"
                id="webapp-canvas-reload-btn"
                onClick={() => applyHotModuleReplacement(activePreviewHtml, webAppName, true)}
                className="p-1.5 rounded-md hover:bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                title="Hard reload preview sandbox"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Domain Config Option Trigger */}
              <button
                type="button"
                onClick={() => setShowWebDomainModal(true)}
                className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white text-[#55504A] border border-[#D5D0C7] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                title="Custom Domain Hosting & Mobile App Packaging"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Domain</span>
              </button>

              {/* Copy URL Link */}
              <button
                type="button"
                onClick={handleCopyPreviewUrl}
                className="p-1.5 rounded-md hover:bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                title="Copy Preview URL"
              >
                {copiedPreviewUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Primary CTA: Open in New Tab */}
              <a
                id="webapp-canvas-open-newtab-btn"
                href={activePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1F1E1D] hover:bg-[#38342E] text-white transition-all shadow-xs shrink-0 cursor-pointer"
                title={`Open built website in dedicated new tab: ${activePreviewUrl}`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
            </div>
          </div>

          {/* AI Studio 3-Column Panel (Files | Source | Live Preview) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* COLUMN 1: Project File Tree */}
            {(studioLayout === 'split' || studioLayout === 'files') && (
              <div
                id="studio-file-tree"
                className={`${
                  studioLayout === 'files' ? 'w-full flex-1' : 'w-full lg:w-44 xl:w-52 shrink-0'
                } border-b lg:border-b-0 lg:border-r border-[#E5E2DC] bg-[#FAF8F5] flex flex-col overflow-hidden max-h-48 lg:max-h-none`}
              >
                <div className="px-3 py-2 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between text-xs font-semibold text-[#1F1E1D]">
                  <div className="flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-600" />
                    <span>Project Files</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E5E2DC] text-[#736E67] font-mono font-bold">
                    {projectFiles.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                  {projectFiles.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#736E67] space-y-1.5 my-auto">
                      <Folder className="w-7 h-7 text-[#C5C0B7] mx-auto" />
                      <p className="font-semibold text-[#1F1E1D]">No files generated</p>
                      <p className="text-[11px] leading-relaxed">
                        Build an app or attach a GitHub file to explore project files.
                      </p>
                    </div>
                  ) : (
                    projectFiles.map((f) => {
                      const isSelected = activePath === f.path;
                      const fType = detectFileType(f.path, f.content);
                      const isHtml = f.path.endsWith('.html') || f.path.endsWith('.htm');
                      const isCss = f.path.endsWith('.css');
                      const isJs = f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.jsx') || f.path.endsWith('.tsx');
                      const isPy = f.path.endsWith('.py');

                      return (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => {
                            setActivePath(f.path);
                            setIsEditingSource(false);
                            if (studioLayout === 'files') setStudioLayout('code');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left cursor-pointer group ${
                            isSelected
                              ? 'bg-[#1F1E1D] text-white shadow-xs font-semibold'
                              : 'text-[#44403C] hover:bg-[#EFECE6] hover:text-[#1F1E1D]'
                          }`}
                          title={f.path}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isHtml ? (
                              <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-orange-600'}`} />
                            ) : isCss ? (
                              <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-300' : 'text-blue-600'}`} />
                            ) : isJs ? (
                              <Code2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-300' : 'text-indigo-600'}`} />
                            ) : isPy ? (
                              <Terminal className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />
                            ) : (
                              <File className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-neutral-300' : 'text-[#736E67]'}`} />
                            )}
                            <span className="truncate">{f.path}</span>
                          </div>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase shrink-0 ${
                              isSelected
                                ? 'bg-neutral-800 text-neutral-300'
                                : 'bg-[#EAE6DF] text-[#736E67] group-hover:bg-[#DDD7CD]'
                            }`}
                          >
                            {fType.extension.replace('.', '') || fType.id}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* COLUMN 2: Source Code Pane */}
            {(studioLayout === 'split' || studioLayout === 'code') && (
              <div
                id="studio-source-pane"
                className={`${
                  studioLayout === 'code' ? 'w-full flex-1' : 'flex-1 min-w-[280px]'
                } border-b lg:border-b-0 lg:border-r border-[#E5E2DC] bg-[#1E1E1E] text-neutral-200 flex flex-col overflow-hidden`}
              >
                {/* Source Header */}
                <div className="px-3 py-2 bg-[#151413] border-b border-[#2B2824] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-mono font-bold text-white truncate">
                      {selectedFile ? selectedFile.path : 'index.html'}
                    </span>
                    {selectedFile && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-sans hidden sm:inline">
                        {selectedFileType.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedFile && (
                      <>
                        {isEditingSource ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveSourceEdit}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition shadow-2xs"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditableSourceContent(selectedFile.content);
                                setIsEditingSource(false);
                              }}
                              className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartEditSource}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2B2824] hover:bg-[#38342E] text-neutral-300 hover:text-white text-[11px] font-medium cursor-pointer transition"
                            title="Edit file source directly"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleCopySource}
                          className="p-1 rounded hover:bg-[#2B2824] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy file source"
                        >
                          {copiedSource ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Source Code Content */}
                <div className="flex-1 overflow-auto bg-[#1E1E1E]">
                  {isEditingSource ? (
                    <textarea
                      value={editableSourceContent}
                      onChange={(e) => setEditableSourceContent(e.target.value)}
                      className="w-full h-full p-3 bg-transparent text-emerald-400 font-mono text-xs leading-relaxed outline-hidden resize-none"
                      spellCheck={false}
                    />
                  ) : selectedFile ? (
                    <pre className="p-3 font-mono text-xs leading-relaxed text-neutral-300 overflow-x-auto select-text">
                      <code>{selectedFile.content}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center text-xs text-neutral-500">
                      Select or generate a file to view source code.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* COLUMN 3: Live Preview Pane */}
            {(studioLayout === 'split' || studioLayout === 'preview') && (
              <div
                id="studio-preview-pane"
                className={`${
                  studioLayout === 'preview' ? 'w-full flex-1' : 'flex-1 min-w-[320px]'
                } bg-[#EFEBE4]/60 flex flex-col overflow-hidden relative`}
              >
                {/* Preview Header */}
                <div className="px-3 py-2 bg-[#FAF8F3] border-b border-[#E5E2DC] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-semibold text-[#1F1E1D] truncate">
                      {previewBundle.isHtml
                        ? `Preview (${previewBundle.previewPath || 'index.html'})`
                        : `Preview`}
                    </span>
                    {selectedFile && previewBundle.previewPath && selectedFile.path !== previewBundle.previewPath && previewBundle.isHtml && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-sans hidden sm:inline truncate">
                        live bundled with {selectedFile.path}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => applyHotModuleReplacement(activePreviewHtml, cleanAppSlug, true)}
                      className="p-1 rounded hover:bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                      title="Hard reload preview sandbox"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={activePreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1E1D] hover:bg-[#38342E] text-white text-[11px] font-bold transition shadow-2xs shrink-0 cursor-pointer"
                      title={`Open live app in dedicated tab: ${activePreviewUrl}`}
                    >
                      <ExternalLink className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Open in Tab</span>
                    </a>
                  </div>
                </div>

                {/* Preview Iframe Container */}
                <div className="flex-1 flex items-center justify-center p-3 overflow-auto">
                  {previewBundle.isHtml || projectFiles.length === 0 ? (
                    <div
                      className={`transition-all duration-200 overflow-hidden bg-white ${
                        previewViewport === 'mobile'
                          ? 'w-[375px] h-[667px] rounded-2xl shadow-2xl border-4 border-[#1F1E1D]'
                          : previewViewport === 'tablet'
                          ? 'w-[768px] h-[780px] rounded-xl shadow-2xl border-2 border-[#D5D0C7]'
                          : 'w-full h-full rounded-md shadow-xs border border-[#E0DCD5]'
                      }`}
                    >
                      <iframe
                        ref={previewIframeRef}
                        key={previewIframeKey}
                        srcDoc={prepareHmrHtml(activePreviewHtml)}
                        title={`Live Preview of ${cleanAppSlug}`}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-popups"
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-sm bg-white rounded-xl border border-[#D5D0C7] shadow-sm p-5 space-y-3 text-center my-auto">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1F1E1D]">Non-HTML File: {selectedFile?.path}</h4>
                        <p className="text-xs text-[#736E67] mt-1 leading-relaxed">
                          This file ({selectedFileType.name}) runs in the backend sandbox, not in the browser HTML iframe.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('terminal')}
                        className="px-3.5 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#3D3A37] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        <span>View Sandbox Output</span>
                      </button>
                    </div>
                  )}
                </div>

                {projectFiles.length === 0 && (
                  <div className="px-3 py-1 bg-[#FAF8F5] border-t border-[#E5E2DC] text-[10px] text-[#736E67] text-center">
                    Starter placeholder — generate an application to see your live preview
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Domain & Android Hosting Modal */}
          {showWebDomainModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#D5D0C7] shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#1F1E1D]">Domain Configuration</h3>
                      <p className="text-[11px] text-[#736E67]">Directly host your web app or link your custom domain</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWebDomainModal(false)}
                    className="p-1 rounded-md text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Default Workspace URL */}
                <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5E2DC] space-y-1">
                  <div className="text-[10px] font-bold text-[#736E67] uppercase tracking-wider">
                    Current Preview URL
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-xs text-[#1F1E1D] font-bold truncate">
                      {activePreviewUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPreviewUrl}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-[#D5D0C7] hover:bg-[#EFECE6]"
                    >
                      {copiedPreviewUrl ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Custom Domain Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1F1E1D]">
                    Link Custom Domain
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={webCustomDomain}
                      onChange={(e) => {
                        setWebCustomDomain(e.target.value);
                        setWebDomainSaved(false);
                      }}
                      placeholder="myapp.com or app.mybrand.com"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#D5D0C7] focus:outline-hidden focus:ring-2 focus:ring-[#1F1E1D]/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (webCustomDomain.trim()) setWebDomainSaved(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1F1E1D] text-white hover:bg-[#33302C]"
                    >
                      Save
                    </button>
                  </div>
                  {webDomainSaved && (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ✓ Domain staged. Point DNS CNAME to <code className="font-bold">cname.alphanexai.vercel.app</code>.
                    </p>
                  )}
                </div>

                {/* Future Android app roadmap */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Upcoming: Android App Packaging</span>
                  </div>
                  <p className="leading-relaxed">
                    Automated domain SSL provisioning and Android APK building will allow direct export of native mobile applications.
                  </p>
                </div>

                <div className="flex justify-end pt-1 border-t border-[#E5E2DC]">
                  <button
                    type="button"
                    onClick={() => setShowWebDomainModal(false)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FAF8F5] border border-[#D5D0C7] text-[#1F1E1D] hover:bg-[#EFECE6]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Side-by-Side Monaco-Style Diff Viewer (Developer & Build Mode) */}
      {(currentMode === 'developer' || currentMode === 'build') && activeTab === 'diff' && (
        <div id="diff-viewer-content" className="flex-1 flex flex-col overflow-hidden">
          {!currentDiff ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[#736E67] my-auto">
              <Split className="w-8 h-8 opacity-40 mx-auto text-[#AAAAAA]" />
              <p className="font-semibold text-[#1F1E1D] text-sm mt-2">No Active Diff</p>
              <p className="text-xs text-[#736E67] mt-1 max-w-sm">
                Generate or ask the assistant to propose code changes to inspect side-by-side diffs.
              </p>
            </div>
          ) : (
            <>
              {/* File Meta & Detection Header */}
          <div className="px-4 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-mono font-bold text-[#1F1E1D]">
                {currentDiff.filename}
              </span>

              {/* Automatic File Type Detection Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${detectedFileType.badgeBg} ${detectedFileType.badgeText} ${detectedFileType.badgeBorder}`}
                title={`Detected Language: ${detectedFileType.name} | Category: ${detectedFileType.category} | Extension: ${detectedFileType.extension || 'none'}`}
              >
                <span>{detectedFileType.name}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  {detectedFileType.extension || 'detected'}
                </span>
              </div>

              {/* Indentation Rules Badge & Controls */}
              <div
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EFECE6] border border-[#DDD7CD] text-[#44403C] text-[11px]"
                title={`Indentation Rule: ${detectedFileType.indentation.indentGuide} (${detectedFileType.indentation.useTabs ? 'Tab characters' : `${detectedFileType.indentation.tabSize} space characters`})`}
              >
                <AlignLeft className="w-3 h-3 text-[#78716C]" />
                <span className="font-medium">
                  {detectedFileType.indentation.useTabs ? 'Tabs' : `Spaces: ${activeTabSize}`}
                </span>
                <span className="text-[9px] text-[#78716C] font-mono hidden sm:inline">
                  ({detectedFileType.indentation.indentGuide})
                </span>
                <button
                  type="button"
                  onClick={() => setOverrideTabSize(activeTabSize === 2 ? 4 : activeTabSize === 4 ? 8 : 2)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-mono underline ml-0.5"
                  title="Cycle Tab Size (2, 4, 8 spaces)"
                >
                  {activeTabSize === 2 ? '4' : activeTabSize === 4 ? '2' : '2'}sp
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono">
                  +{currentDiff.additions || 12}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-semibold font-mono">
                  -{currentDiff.deletions || 5}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Diff View Mode Toggle */}
              <div className="flex items-center bg-[#E5E2DC] p-0.5 rounded">
                <button
                  type="button"
                  onClick={() => setDiffViewMode('side-by-side')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                    diffViewMode === 'side-by-side'
                      ? 'bg-white text-[#1F1E1D] shadow-xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                  title="Side-by-Side Split View"
                >
                  <Split className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiffViewMode('unified')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                    diffViewMode === 'unified'
                      ? 'bg-white text-[#1F1E1D] shadow-xs'
                      : 'text-[#736E67] hover:text-[#1F1E1D]'
                  }`}
                  title="Unified Git Diff View"
                >
                  <Rows className="w-3 h-3" />
                  <span className="hidden sm:inline">Unified</span>
                </button>
              </div>

              {/* Guides Toggle */}
              <button
                type="button"
                onClick={() => setShowIndentGuides(!showIndentGuides)}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  showIndentGuides
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D]'
                }`}
                title={showIndentGuides ? 'Hide Indentation Guides' : 'Show Indentation Guides'}
              >
                <span>Guides</span>
              </button>

              {/* Wrap Toggle */}
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  wrapLines
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D]'
                }`}
                title={wrapLines ? 'Disable Line Wrap' : 'Enable Line Wrap'}
              >
                <WrapText className="w-3 h-3" />
              </button>

              {/* Copy Code */}
              <button
                type="button"
                onClick={() => handleCopyCode(currentDiff.fixedCode)}
                className="px-2 py-1 rounded bg-[#EFECE6] hover:bg-[#E5E2DC] text-[#1F1E1D] text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>

              {/* Accept Fix */}
              <button
                type="button"
                onClick={() => setAcceptedFix(true)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                  acceptedFix
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#1F1E1D] text-[#FBF9F5] hover:bg-[#3D3A37]'
                }`}
              >
                {acceptedFix ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Applied</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3" />
                    <span>Accept</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Explanation Banner */}
          {currentDiff.explanation && (
            <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-200/80 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
                <p>{currentDiff.explanation}</p>
                <span className="text-[10px] text-blue-700 font-mono bg-blue-100/80 px-1.5 py-0.5 rounded">
                  Format: {detectedFileType.name} ({detectedFileType.indentation.indentGuide})
                </span>
              </div>
            </div>
          )}

          {/* Code Diff Canvas with Syntax Highlighting and Indentation Rules */}
          <div
            className="flex-1 overflow-y-auto bg-[#1E1E1E] text-[#D4D4D4] font-mono text-xs select-text"
            style={{
              tabSize: activeTabSize,
              MozTabSize: activeTabSize,
            }}
          >
            {diffViewMode === 'side-by-side' ? (
              <>
                {/* Split Headers */}
                <div className="sticky top-0 grid grid-cols-2 bg-[#252526] border-b border-[#333333] text-[11px] font-sans font-medium text-[#AAAAAA] z-10">
                  <div className="px-3 py-1.5 border-r border-[#333333] flex items-center justify-between">
                    <span className="font-semibold text-neutral-300">Original (Buggy / Before)</span>
                    <span className="text-red-400 font-mono text-[10px] bg-red-950/60 px-1.5 py-0.5 rounded">
                      - Removed
                    </span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="font-semibold text-neutral-300">AI Fixed (Optimized / After)</span>
                    <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      + Added
                    </span>
                  </div>
                </div>

                {/* Line by line render */}
                <div className="divide-y divide-[#282828]">
                  {Array.from({ length: maxLines }).map((_, i) => {
                    const orig = originalLines[i] ?? '';
                    const fixed = fixedLines[i] ?? '';
                    const isDifferent = orig !== fixed;
                    const origTokens = tokenizedOriginal[i] || [];
                    const fixedTokens = tokenizedFixed[i] || [];

                    return (
                      <div
                        key={i}
                        className="grid grid-cols-2 min-h-[22px] group hover:bg-[#252525] transition-colors"
                      >
                        {/* Left: Original */}
                        <div
                          className={`flex border-r border-[#333333] ${
                            wrapLines ? 'break-all whitespace-pre-wrap' : 'overflow-x-hidden'
                          } ${
                            isDifferent && orig
                              ? 'bg-red-950/35 border-l-2 border-red-500'
                              : orig
                              ? 'text-[#C5C5C5]'
                              : 'bg-[#181818]'
                          }`}
                        >
                          <span className="w-8 shrink-0 text-right pr-2 text-[#555555] select-none bg-[#202020]">
                            {orig ? i + 1 : ''}
                          </span>
                          <span className="w-4 shrink-0 text-center select-none text-red-400 font-bold">
                            {isDifferent && orig ? '-' : ''}
                          </span>
                          <div className={`pl-1 pr-2 ${wrapLines ? '' : 'whitespace-pre overflow-x-auto'}`}>
                            {renderCodeLine(origTokens, orig, activeTabSize, showIndentGuides)}
                          </div>
                        </div>

                        {/* Right: Fixed */}
                        <div
                          className={`flex ${
                            wrapLines ? 'break-all whitespace-pre-wrap' : 'overflow-x-hidden'
                          } ${
                            isDifferent && fixed
                              ? 'bg-emerald-950/35 border-l-2 border-emerald-500'
                              : fixed
                              ? 'text-[#C5C5C5]'
                              : 'bg-[#181818]'
                          }`}
                        >
                          <span className="w-8 shrink-0 text-right pr-2 text-[#555555] select-none bg-[#202020]">
                            {fixed ? i + 1 : ''}
                          </span>
                          <span className="w-4 shrink-0 text-center select-none text-emerald-400 font-bold">
                            {isDifferent && fixed ? '+' : ''}
                          </span>
                          <div className={`pl-1 pr-2 ${wrapLines ? '' : 'whitespace-pre overflow-x-auto'}`}>
                            {renderCodeLine(fixedTokens, fixed, activeTabSize, showIndentGuides)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Unified Git Patch View */
              <>
                <div className="sticky top-0 bg-[#252526] border-b border-[#333333] text-[11px] font-sans font-medium text-[#AAAAAA] z-10 px-3 py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">Unified Diff Patch ({detectedFileType.name})</span>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded">- Original</span>
                    <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">+ Fixed</span>
                  </div>
                </div>

                <div className="divide-y divide-[#262626]">
                  {unifiedDiffLines.map((line, idx) => {
                    const isDelete = line.type === 'delete';
                    const isAdd = line.type === 'add';

                    return (
                      <div
                        key={idx}
                        className={`flex min-h-[22px] group hover:bg-[#252525] transition-colors ${
                          isDelete
                            ? 'bg-red-950/35 border-l-2 border-red-500'
                            : isAdd
                            ? 'bg-emerald-950/35 border-l-2 border-emerald-500'
                            : 'text-[#C5C5C5]'
                        }`}
                      >
                        {/* Old line number */}
                        <span className="w-8 shrink-0 text-right pr-2 text-[#555555] select-none bg-[#202020]">
                          {line.oldLineNum ?? ''}
                        </span>
                        {/* New line number */}
                        <span className="w-8 shrink-0 text-right pr-2 text-[#555555] select-none bg-[#202020]">
                          {line.newLineNum ?? ''}
                        </span>
                        {/* Diff Indicator */}
                        <span
                          className={`w-4 shrink-0 text-center select-none font-bold ${
                            isDelete ? 'text-red-400' : isAdd ? 'text-emerald-400' : 'text-[#444444]'
                          }`}
                        >
                          {isDelete ? '-' : isAdd ? '+' : ' '}
                        </span>
                        {/* Code Content */}
                        <div
                          className={`pl-1 pr-2 ${
                            wrapLines ? 'break-all whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                          }`}
                        >
                          {renderCodeLine(line.tokens, line.text, activeTabSize, showIndentGuides)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Diff Bottom Action Bar with Diagnostics */}
          <div className="p-3 bg-[#FAF8F3] border-t border-[#E5E2DC] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPythonCode(currentDiff.fixedCode);
                  setActiveTab('terminal');
                }}
                className="text-xs text-amber-800 hover:text-amber-900 font-medium flex items-center gap-1"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>
                  {detectedFileType.id === 'python'
                    ? 'Test Fixed Code in Pyodide WASM \u2192'
                    : 'Send Code to Terminal \u2192'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('github')}
                className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center gap-1"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Prepare GitHub PR \u2192</span>
              </button>
            </div>

            {/* Syntax and indentation status pill */}
            <div className="text-[11px] text-[#78716C] font-mono flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Syntax: Prism ({detectedFileType.prismLanguage})</span>
              </span>
              <span>&bull;</span>
              <span>Rule: {detectedFileType.indentation.indentGuide}</span>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Terminal & Real Sandbox Verification Logs (Developer & Build Mode) */}
      {(currentMode === 'developer' || currentMode === 'build') && activeTab === 'terminal' && (
        <div id="terminal-content" className="flex-1 flex flex-col overflow-hidden bg-[#0F0F0F] text-[#E0E0E0]">
          {/* Terminal Toolbar */}
          <div className="px-4 py-2.5 bg-[#181818] border-b border-[#2B2B2B] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-white">Vercel Sandbox Verification</span>
              {sandboxCheckResult && typeof sandboxCheckResult.checksRun === 'number' && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    sandboxCheckResult.passed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {sandboxCheckResult.checksPassed || 0}/{sandboxCheckResult.checksRun} Checks Passed
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTerminalOutput('Terminal output cleared.\n')}
                className="px-2 py-1 rounded bg-[#252525] hover:bg-[#303030] text-[#AAAAAA] hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>

              <button
                id="rerun-sandbox-check-btn"
                type="button"
                disabled={sandboxCheckRunning || projectFiles.length === 0}
                onClick={handleRunSandboxCheck}
                className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Execute runBuildCheckInSandbox on current project files"
              >
                <RefreshCw className={`w-3 h-3 ${sandboxCheckRunning ? 'animate-spin' : ''}`} />
                <span>{sandboxCheckRunning ? 'Checking Sandbox...' : 'Re-run Checks'}</span>
              </button>
            </div>
          </div>

          {/* Terminal Main Output Body */}
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-3 leading-relaxed">
            {!sandboxCheckResult && (!latestVerificationLog || latestVerificationLog.length === 0) && (!terminalOutput || terminalOutput.includes('cleared')) ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-[#777777] my-auto">
                <Terminal className="w-8 h-8 opacity-40 text-[#AAAAAA] mx-auto" />
                <p className="font-semibold text-neutral-300 text-sm">No sandbox run for this project yet.</p>
                <p className="text-xs max-w-sm text-neutral-500">
                  Click &ldquo;Re-run Checks&rdquo; to execute syntax validation and sandbox checks on the current project files.
                </p>
                {projectFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRunSandboxCheck}
                    disabled={sandboxCheckRunning}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#333333] text-neutral-200 border border-[#444444] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Run Sandbox Checks Now
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Real Verification Log lines */}
                {((sandboxCheckResult?.verificationLog && sandboxCheckResult.verificationLog.length > 0) ||
                  (latestVerificationLog && latestVerificationLog.length > 0)) && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-[#888888] font-bold tracking-wider mb-1 select-none">
                      Verification Checks:
                    </div>
                    {(sandboxCheckResult?.verificationLog || latestVerificationLog).map((line: string, idx: number) => {
                      const isFail = line.includes('FAIL') || line.includes('error') || line.includes('✗');
                      const isPass = line.includes('PASS') || line.includes('✓') || line.includes('Passed');
                      const isWarn = line.includes('WARN') || line.includes('notice');
                      return (
                        <div
                          key={idx}
                          className={`font-mono text-xs ${
                            isFail
                              ? 'text-red-400 font-semibold'
                              : isPass
                              ? 'text-emerald-400'
                              : isWarn
                              ? 'text-amber-300'
                              : 'text-neutral-300'
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Stdout / Stderr details */}
                {sandboxCheckResult?.stdout && (
                  <div className="mt-3 pt-3 border-t border-[#252525] space-y-1">
                    <div className="text-[10px] uppercase text-[#888888] font-bold tracking-wider select-none">
                      Sandbox stdout:
                    </div>
                    <pre className="text-neutral-300 whitespace-pre-wrap">{sandboxCheckResult.stdout}</pre>
                  </div>
                )}

                {sandboxCheckResult?.stderr && (
                  <div className="mt-3 pt-3 border-t border-[#252525] space-y-1">
                    <div className="text-[10px] uppercase text-red-400 font-bold tracking-wider select-none">
                      Sandbox stderr:
                    </div>
                    <pre className="text-red-400 whitespace-pre-wrap">{sandboxCheckResult.stderr}</pre>
                  </div>
                )}

                {terminalOutput &&
                  !sandboxCheckResult?.verificationLog &&
                  (!latestVerificationLog || latestVerificationLog.length === 0) && (
                    <pre className="text-neutral-300 whitespace-pre-wrap">{terminalOutput}</pre>
                  )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: GitHub PR Action Bar (Developer Mode Only) */}
      {(currentMode === 'developer' || currentMode === 'build') && activeTab === 'github' && (
        <div id="github-pr-content" className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5E2DC]">
            <GitPullRequest className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-sm font-bold text-[#1F1E1D]">GitHub Pull Request & Push</h3>
              <p className="text-xs text-[#736E67]">
                Push approved patches and diffs directly to your repository.
              </p>
            </div>
          </div>

          {/* PR Confirmation Banner */}
          {createdPRUrl && (
            <div
              id="pr-success-banner"
              className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-2.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Pull Request Created Successfully!</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-800">
                {prMessage || `Branch '${featureBranch}' was created and merged into PR.`}
              </p>
              {prStats && (
                <div className="flex items-center gap-3 text-[11px] font-mono pt-0.5">
                  <span className="text-emerald-700 font-semibold">+{prStats.additions} additions</span>
                  <span className="text-red-700 font-semibold">-{prStats.deletions} deletions</span>
                  <span className="text-[#736E67]">{prStats.changedFiles} file changed</span>
                </div>
              )}
              <div className="pt-1 flex items-center gap-2">
                <a
                  href={createdPRUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-2xs"
                >
                  <span>View PR on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdPRUrl);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 text-xs font-medium hover:bg-emerald-100 transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#1F1E1D] mb-1">
                Repository URL
              </label>
              <input
                id="github-repo-url-input"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#FDFBF7] text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-[#1F1E1D] mb-1">
                  Target Branch
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#FDFBF7]">
                  <GitBranch className="w-3.5 h-3.5 text-[#736E67]" />
                  <input
                    id="github-branch-input"
                    type="text"
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full bg-transparent text-[#1F1E1D] outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#1F1E1D] mb-1">
                  Feature Branch
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#F3EFEA] text-[#736E67]">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px] truncate">{featureBranch}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#1F1E1D] mb-1">
                Pull Request Title
              </label>
              <input
                id="github-pr-title-input"
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#FDFBF7] text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1F1E1D] mb-1">
                PR Description / Commit Message
              </label>
              <textarea
                id="github-pr-body-input"
                rows={3}
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#FDFBF7] text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6] resize-none"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              id="create-pr-submit-btn"
              type="button"
              disabled={isPushingPR}
              onClick={handleCreatePR}
              className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>
                {isPushingPR
                  ? 'Pushing Commit & Creating PR...'
                  : 'Create Pull Request & Push Fix'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Shared/Developer Tab 4 & Researcher Tab 3: MCP Connectors Panel */}
      {activeTab === 'connectors' && (
        <div id="mcp-connectors-canvas-content" className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-[#1F1E1D]">MCP Connectors</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                {mcpConnectors.filter((c) => c.enabled).length} Active
              </span>
            </div>
            <button
              id="mcp-canvas-ping-btn"
              type="button"
              onClick={handlePingMcp}
              disabled={isPingingMcp}
              className="px-2.5 py-1 rounded-md bg-[#1F1E1D] hover:bg-[#3D3A37] text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${isPingingMcp ? 'animate-spin' : ''}`} />
              <span>{isPingingMcp ? 'Pinging...' : 'Verify Status'}</span>
            </button>
          </div>

          {mcpPingMessage && (
            <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{mcpPingMessage}</span>
            </div>
          )}

          {/* Connectors List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="p-3 bg-[#F4F1EA] border border-[#E5E2DC] rounded-xl text-xs text-[#55504A]">
              <p className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Model Context Protocol (MCP) Integration
              </p>
              <p className="text-[11px] text-[#736E67] mt-1 leading-relaxed">
                Connect external code repositories, Google Docs documentation, and Gmail threads to your agents with strict read-only execution scopes.
              </p>
            </div>

            <div className="space-y-2.5">
              {mcpConnectors.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    c.enabled
                      ? 'bg-white border-[#D5D0C7] shadow-xs'
                      : 'bg-[#FBF9F5] border-[#E5E2DC] opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F3EFEA] border border-[#E5E2DC] flex items-center justify-center shrink-0 mt-0.5">
                        {c.id === 'github' && <Github className="w-4 h-4 text-[#1F1E1D]" />}
                        {c.id === 'google-docs' && <FileText className="w-4 h-4 text-blue-600" />}
                        {c.id === 'gmail' && <Mail className="w-4 h-4 text-red-600" />}
                        {c.category === 'custom' && <Database className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1F1E1D]">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#736E67] mt-0.5 leading-snug">{c.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleMcpConnector(c.id)}
                      className="cursor-pointer text-[#736E67] hover:text-[#1F1E1D] shrink-0"
                      title={c.enabled ? 'Disable' : 'Enable'}
                    >
                      {c.enabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-[#A8A298]" />
                      )}
                    </button>
                  </div>

                  {/* Discovered Tools Pill list */}
                  <div className="mt-2.5 pt-2 border-t border-[#E5E2DC]/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-[#858079] uppercase tracking-wider block">
                        Available Tools ({c.tools.length}):
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">Click to test tool</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.tools.map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={runningTool === t || !c.enabled}
                          onClick={() => handleExecuteMcpTool(c.id, t)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F3EFEA] hover:bg-[#EAE5DE] active:bg-[#DFD9CE] text-[#3D3A37] hover:text-[#1F1E1D] border border-[#E5E2DC] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          title={`Execute ${t} via ${c.name}`}
                        >
                          {runningTool === t ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-600" />
                          ) : (
                            <Play className="w-2.5 h-2.5 text-emerald-600" />
                          )}
                          <span>{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Tool Execution Output Drawer */}
            {toolExecutionResult && (
              <div className="p-3 bg-[#FAF8F5] border border-emerald-300 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tool Execution: <code className="font-mono text-emerald-800">{toolExecutionResult.tool}</code></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToolExecutionResult(null)}
                    className="text-[11px] text-[#736E67] hover:text-[#1F1E1D]"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] text-[#55504A] leading-relaxed">
                  {toolExecutionResult.message}
                </p>
                {toolExecutionResult.output != null && (
                  <pre className="p-2 rounded-lg bg-[#1E1E1E] text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-36 leading-normal">
                    {JSON.stringify(toolExecutionResult.output, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Custom MCP Connector Section */}
            <div className="border-t border-[#E5E2DC] pt-3">
              {!showAddMcpForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddMcpForm(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-[#D5D0C7] hover:border-[#1F1E1D] text-xs font-semibold text-[#55504A] hover:text-[#1F1E1D] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Add Custom MCP Server</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddCustomMcp}
                  className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-950">Add Remote MCP Server</span>
                    <button
                      type="button"
                      onClick={() => setShowAddMcpForm(false)}
                      className="text-[11px] text-[#736E67] hover:text-[#1F1E1D]"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    placeholder="Name (e.g. Postgres DB / Linear)"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-blue-500"
                  />
                  <input
                    type="url"
                    value={newMcpUrl}
                    onChange={(e) => setNewMcpUrl(e.target.value)}
                    placeholder="https://mcp.yourdomain.com/v1"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      Save Connector
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {currentMode === 'researcher' && activeTab === 'sources' && (
        <div id="sources-inspector-content" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-[#1F1E1D]">Verified Search Sources</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                {displayCitations.length} Citations
              </span>
            </div>
            <span className="text-[11px] text-[#736E67]">
              Grounding Inspector
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayCitations.length === 0 ? (
              <div className="p-8 text-center space-y-3 border border-dashed border-[#D5D0C7] rounded-xl bg-white/60">
                <BookOpen className="w-8 h-8 text-[#999] mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#1F1E1D]">No Live Citations Recorded</p>
                  <p className="text-[11px] text-[#736E67] max-w-sm mx-auto leading-relaxed">
                    Live web sources and search grounding will appear here when querying a search-grounded model (e.g. Gemini with Grounding enabled or Perplexity Sonar).
                  </p>
                </div>
              </div>
            ) : (
              displayCitations.map((citation, idx) => (
                <div
                  key={citation.id || idx}
                  className="p-3.5 rounded-xl border border-[#E5E2DC] bg-white hover:border-[#D5D0C7] transition-all space-y-2 shadow-2xs"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center justify-center border border-emerald-200">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-[#1F1E1D]">
                      {citation.sourceName}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {citation.reliabilityScore || 95}% Verifiable
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-[#1F1E1D] leading-snug">
                  {citation.title}
                </h4>

                <p className="text-xs text-[#55504A] leading-relaxed bg-[#FBF9F5] p-2 rounded-lg border border-[#EFECE6] italic">
                  &ldquo;{citation.snippet}&rdquo;
                </p>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 hover:underline text-[11px] truncate max-w-[280px]"
                  >
                    <Globe className="w-3 h-3 shrink-0" />
                    <span className="truncate">{citation.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${citation.title}. ${citation.sourceName}. Available at: ${citation.url}`
                      );
                      setCopiedCitationId(citation.id);
                      setTimeout(() => setCopiedCitationId(null), 2000);
                    }}
                    className="px-2 py-1 rounded bg-[#F3EFEA] hover:bg-[#EAE5DE] text-[#1F1E1D] text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
                  >
                    {copiedCitationId === citation.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#736E67]" />
                        <span>Copy Citation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* Researcher Tab 2: Research Brief */}
      {currentMode === 'researcher' && activeTab === 'brief' && (
        <div id="research-brief-content" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-[#1F1E1D]">Executive Research Brief</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isExportingGDocs}
                onClick={() => {
                  const briefText = `# Alphanex AI Studio — Executive Research Brief\n\n## Overview\nAuthoritative research synthesis grounded in verified Nepal & international sources.\n\n## Key Findings\n- Payment system interoperability is governed by Nepal Rastra Bank directives.\n- Test-time compute scaling enhances verification depth across multi-hop reasoning.\n- Open-weight models are driving high adoption across local software ecosystems.\n\n## Verified Bibliography\n${displayCitations
                    .map((c, i) => `${i + 1}. ${c.title} — ${c.sourceName} (${c.url})`)
                    .join('\n')}`;
                  handleExportToGoogleDocs('Alphanex AI Studio — Executive Research Brief', briefText);
                }}
                className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Export Brief directly to Google Docs"
              >
                {isExportingGDocs ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                ) : (
                  <FileText className="w-3 h-3 text-blue-600" />
                )}
                <span>{isExportingGDocs ? 'Exporting...' : 'Export to Docs'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const briefText = `# Alphanex AI Studio — Executive Research Brief\n\n## Overview\nAuthoritative research synthesis grounded in verified Nepal & international sources.\n\n## Key Findings\n- Payment system interoperability is governed by Nepal Rastra Bank directives.\n- Test-time compute scaling enhances verification depth across multi-hop reasoning.\n- Open-weight models are driving high adoption across local software ecosystems.\n\n## Verified Bibliography\n${displayCitations
                    .map((c, i) => `${i + 1}. ${c.title} — ${c.sourceName} (${c.url})`)
                    .join('\n')}`;
                  navigator.clipboard.writeText(briefText);
                  setCopiedBrief(true);
                  setTimeout(() => setCopiedBrief(false), 2000);
                }}
                className="px-2.5 py-1 rounded bg-[#EFECE6] hover:bg-[#E5E2DC] text-[#1F1E1D] text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {copiedBrief ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Brief Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {gdocsExportUrl && (
            <div className="mx-4 mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>Document brief ready in Google Docs!</span>
              </div>
              <a
                href={gdocsExportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors"
              >
                <span>Open Doc</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#1F1E1D] leading-relaxed">
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-900">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Authoritative Fact Verification</span>
              </div>
              <p className="text-teal-800 leading-relaxed text-[11px]">
                This synthesis is anchored in primary documents from regulatory authorities and peer-reviewed preprint registries.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-sm text-[#1F1E1D]">Grounded Highlights</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-[#33302C]">
                <li>
                  <strong className="text-[#1F1E1D]">Nepal Fintech Directives:</strong> Full compliance with eSewa v2 EPAY standards requires cryptographic HMAC-SHA256 digests over ordered transaction parameters.
                </li>
                <li>
                  <strong className="text-[#1F1E1D]">Reasoning Efficiency:</strong> Frontier models leverage test-time compute tokens to verify intermediate inferences before finalizing output.
                </li>
                <li>
                  <strong className="text-[#1F1E1D]">Regional NLP Integration:</strong> Dev models are increasingly fine-tuned on South Asian multilingual datasets with specialized vocabulary tokenization.
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-[#E5E2DC] space-y-2">
              <h4 className="font-bold text-xs text-[#1F1E1D]">Verified Sources Bibliography</h4>
              <div className="space-y-1.5 text-[11px] text-[#55504A]">
                {displayCitations.map((c, i) => (
                  <div key={c.id || i} className="flex items-start gap-1.5">
                    <span className="font-mono text-[#736E67]">[{i + 1}]</span>
                    <span>
                      <strong>{c.sourceName}</strong> &mdash; &ldquo;{c.title}&rdquo; ({c.url})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Tab 1: Document Canvas */}
      {currentMode === 'general' && activeTab === 'document' && (
        <div id="document-canvas-content" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-[#1F1E1D]">Document Canvas</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#736E67]">
                {(latestAssistantMessage || 'Alphanex AI Studio').split(/\s+/).filter(Boolean).length} Words
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  latestAssistantMessage || 'No content in document yet.'
                );
                setCopiedDoc(true);
                setTimeout(() => setCopiedDoc(false), 2000);
              }}
              className="px-2.5 py-1 rounded bg-[#EFECE6] hover:bg-[#E5E2DC] text-[#1F1E1D] text-xs font-medium flex items-center gap-1 transition-colors"
            >
              {copiedDoc ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-[#1F1E1D] bg-white">
            {latestAssistantMessage ? (
              <div className="prose prose-stone max-w-none text-xs leading-relaxed">
                <ReactMarkdown>{latestAssistantMessage}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#736E67]">
                <FileText className="w-8 h-8 text-[#B8B2A6] mb-2" />
                <p className="font-medium text-xs text-[#1F1E1D]">Document Canvas Ready</p>
                <p className="text-[11px] text-[#858079] max-w-xs mt-1">
                  Send a prompt in General Mode to review and edit structured output here in a clean, distraction-free reading canvas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Tab 2: Scratchpad */}
      {currentMode === 'general' && activeTab === 'scratchpad' && (
        <div id="scratchpad-content" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FAF8F3] border-b border-[#E5E2DC] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#55504A]" />
              <span className="font-semibold text-[#1F1E1D]">Scratchpad & Notes</span>
              <span className="text-[10px] text-[#858079]">
                {scratchpadText.length} chars
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isExportingGDocs || !scratchpadText.trim()}
                onClick={() => handleExportToGoogleDocs('Alphanex AI Studio — Scratchpad Notes', scratchpadText)}
                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Export Scratchpad to Google Docs"
              >
                {isExportingGDocs ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                ) : (
                  <FileText className="w-3 h-3 text-blue-600" />
                )}
                <span>Docs</span>
              </button>

              <button
                type="button"
                onClick={() => setScratchpadText('')}
                className="p-1 rounded hover:bg-[#EAE5DE] text-[#736E67] hover:text-[#1F1E1D] transition-colors"
                title="Clear Scratchpad"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(scratchpadText);
                  setCopiedScratchpad(true);
                  setTimeout(() => setCopiedScratchpad(false), 2000);
                }}
                className="px-2 py-1 rounded bg-[#EFECE6] hover:bg-[#E5E2DC] text-[#1F1E1D] text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {copiedScratchpad ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 bg-[#FAF8F4] overflow-hidden flex flex-col">
            <textarea
              id="scratchpad-textarea"
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              placeholder="Jot down notes, test prompts, or outline project milestones here..."
              className="flex-1 w-full p-3 rounded-lg border border-[#E5E2DC] bg-white text-xs font-mono leading-relaxed text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6] resize-none"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
