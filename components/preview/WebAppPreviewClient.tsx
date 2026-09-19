'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Settings,
  X,
  Sparkles,
  Code2,
  Zap,
  UploadCloud,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  getWebAppData,
  saveWebAppData,
  getPreviewUrl,
  slugifyAppName,
  prepareHmrHtml,
  sendHmrUpdateToWindow,
  DEFAULT_STARTER_WEBAPP_HTML,
} from '@/lib/webapp-preview';

interface WebAppPreviewClientProps {
  appName: string;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export default function WebAppPreviewClient({ appName }: WebAppPreviewClientProps) {
  const cleanAppName = slugifyAppName(appName);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [htmlCode, setHtmlCode] = useState<string>(() => getWebAppData(cleanAppName).html);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [hmrStatus, setHmrStatus] = useState<'idle' | 'updating' | 'hot-updated'>('idle');
  const [lastHmrTime, setLastHmrTime] = useState<Date | null>(null);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showDomainModal, setShowDomainModal] = useState<boolean>(false);
  const [customDomainInput, setCustomDomainInput] = useState<string>('');
  const [isAttachingDomain, setIsAttachingDomain] = useState<boolean>(false);
  const [domainStatus, setDomainStatus] = useState<{
    configured?: boolean;
    verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
    domain?: string;
  } | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Deployment state
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [copiedDeployUrl, setCopiedDeployUrl] = useState<boolean>(false);

  const [showSourceCode, setShowSourceCode] = useState<boolean>(false);
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [editableCode, setEditableCode] = useState<string>(() => getWebAppData(cleanAppName).html);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Apply HMR without destroying the iframe element
  const applyHotModuleReplacement = useCallback(
    (newHtml: string, forceReload?: boolean) => {
      setHtmlCode(newHtml);
      setEditableCode(newHtml);

      if (forceReload) {
        setIframeKey((prev) => prev + 1);
        setHmrStatus('hot-updated');
        setLastHmrTime(new Date());
        setTimeout(() => setHmrStatus('idle'), 2500);
        return;
      }

      if (!autoRefreshEnabled) {
        return;
      }

      setHmrStatus('updating');

      // 1. PostMessage to iframe HMR runtime
      let posted = false;
      if (iframeRef.current?.contentWindow) {
        posted = sendHmrUpdateToWindow(iframeRef.current.contentWindow, newHtml, cleanAppName);
      }

      // 2. Fallback soft-update if iframe doesn't respond
      const timer = setTimeout(() => {
        if (iframeRef.current && (!posted || hmrStatus === 'updating')) {
          try {
            iframeRef.current.srcdoc = prepareHmrHtml(newHtml);
            setHmrStatus('hot-updated');
            setLastHmrTime(new Date());
          } catch {
            setIframeKey((prev) => prev + 1);
          }
          setTimeout(() => setHmrStatus('idle'), 2500);
        }
      }, 500);

      return () => clearTimeout(timer);
    },
    [cleanAppName, autoRefreshEnabled, hmrStatus]
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

  // Listen to external storage, custom events, and cross-tab BroadcastChannel
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `alphanex_webapp_code_${cleanAppName}` && e.newValue) {
        applyHotModuleReplacement(e.newValue);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.appName === cleanAppName && ce.detail?.html) {
        applyHotModuleReplacement(ce.detail.html);
      }
    };

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('alphanex_webapp_hmr');
        bc.onmessage = (event) => {
          if (
            event.data?.type === 'ALPHANEX_HMR_UPDATE' &&
            event.data?.appName === cleanAppName &&
            event.data?.html
          ) {
            applyHotModuleReplacement(event.data.html);
          }
        };
      } catch {}
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('alphanex-webapp-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('alphanex-webapp-updated', handleCustomEvent);
      if (bc) bc.close();
    };
  }, [cleanAppName, applyHotModuleReplacement]);

  const previewUrl = typeof window !== 'undefined' ? window.location.href : getPreviewUrl(cleanAppName);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(previewUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyDeployUrl = () => {
    if (deployedUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deployedUrl);
      setCopiedDeployUrl(true);
      setTimeout(() => setCopiedDeployUrl(false), 2000);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployError(null);
    setShowDeployModal(true);

    try {
      const currentCode = htmlCode || getWebAppData(cleanAppName).html || DEFAULT_STARTER_WEBAPP_HTML;
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: cleanAppName,
          html: currentCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeployError(data.error || 'Deployment failed. Check VERCEL_TOKEN configuration in Settings.');
      } else {
        setDeployedUrl(data.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeployError(`Network error during deployment: ${msg}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAttachDomain = async () => {
    const trimmed = customDomainInput.trim();
    if (!trimmed) return;

    setIsAttachingDomain(true);
    setDomainError(null);
    setDomainStatus(null);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'domain',
          appName: cleanAppName,
          domain: trimmed,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setDomainError(data.error || 'Failed to attach domain.');
      } else {
        setDomainStatus({
          domain: data.domain,
          verification: data.verification,
          configured: data.configured,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDomainError(`Domain configuration network error: ${msg}`);
    } finally {
      setIsAttachingDomain(false);
    }
  };

  const handleRefreshIframe = () => {
    applyHotModuleReplacement(htmlCode, true);
  };

  const handleSaveCode = () => {
    saveWebAppData(cleanAppName, editableCode);
    applyHotModuleReplacement(editableCode);
    setIsEditingCode(false);
  };

  const handleResetStarter = () => {
    saveWebAppData(cleanAppName, DEFAULT_STARTER_WEBAPP_HTML);
    applyHotModuleReplacement(DEFAULT_STARTER_WEBAPP_HTML, true);
    setIsEditingCode(false);
  };

  // Viewport width styling
  const getContainerStyle = () => {
    if (viewport === 'mobile') return 'w-[375px] h-[720px] rounded-2xl shadow-2xl border-4 border-[#1F1E1D]';
    if (viewport === 'tablet') return 'w-[768px] h-[850px] rounded-xl shadow-2xl border-2 border-[#D5D0C7]';
    return 'w-full h-full';
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F5F2EC] text-[#1F1E1D] overflow-hidden select-none font-sans">
      {/* Top Preview Navigation Bar */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-[#E5E2DC] px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-2xs">
        {/* Left: Back link & App Identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/workspace"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EFECE6] border border-[#E0DCD5] text-[#55504A] hover:text-[#1F1E1D] transition-colors"
            title="Return to Studio Workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspace</span>
          </Link>

          <div className="h-4 w-[1px] bg-[#E0DCD5]" />

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#1F1E1D] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              A
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1F1E1D] tracking-tight">{cleanAppName}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live WebApp
              </span>
            </div>
          </div>
        </div>

        {/* Center: Viewport Switcher */}
        <div className="hidden md:flex items-center bg-[#F0ECE4] p-0.5 rounded-lg border border-[#DDD8CF]">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
              viewport === 'desktop'
                ? 'bg-white text-[#1F1E1D] font-bold shadow-xs'
                : 'text-[#736E67] hover:text-[#1F1E1D]'
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
              viewport === 'tablet'
                ? 'bg-white text-[#1F1E1D] font-bold shadow-xs'
                : 'text-[#736E67] hover:text-[#1F1E1D]'
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
              viewport === 'mobile'
                ? 'bg-white text-[#1F1E1D] font-bold shadow-xs'
                : 'text-[#736E67] hover:text-[#1F1E1D]'
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right: Actions, Domain Config & Copy */}
        <div className="flex items-center gap-2">
          {/* HMR Auto-Refresh Toggle & Indicator */}
          <button
            type="button"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
                ? 'Auto-refresh / HMR is active. Code updates from Studio hot-swap instantly into sandbox. Click to pause.'
                : 'Auto-refresh is paused. Click to resume instant HMR.'
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
            <span className="hidden sm:inline">
              {!autoRefreshEnabled
                ? 'HMR Paused'
                : hmrStatus === 'updating'
                ? 'Hot Swapping...'
                : hmrStatus === 'hot-updated'
                ? 'Hot Updated'
                : 'HMR Active'}
            </span>
            {autoRefreshEnabled && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hmrStatus === 'updating'
                    ? 'bg-amber-500 animate-ping'
                    : hmrStatus === 'hot-updated'
                    ? 'bg-emerald-500'
                    : 'bg-emerald-500 animate-pulse'
                }`}
              />
            )}
          </button>

          {/* Refresh iframe */}
          <button
            type="button"
            onClick={handleRefreshIframe}
            className="p-1.5 rounded-lg text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer"
            title="Reload Sandbox"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Toggle Code Inspector */}
          <button
            type="button"
            onClick={() => setShowSourceCode(!showSourceCode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              showSourceCode
                ? 'bg-[#1F1E1D] text-white border-[#1F1E1D]'
                : 'bg-white text-[#55504A] border-[#D5D0C7] hover:bg-[#FAF8F5]'
            }`}
            title="Inspect or Edit Source Code"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Source</span>
          </button>

          {/* Domain Config Option Button */}
          <button
            type="button"
            onClick={() => setShowDomainModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#D5D0C7] text-[#55504A] hover:text-[#1F1E1D] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Custom Domain & Host Configuration"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Domain & Host</span>
          </button>

          {/* Real Deploy to Vercel Button */}
          <button
            type="button"
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            title="Deploy live to a public URL via Vercel"
          >
            {isDeploying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>{isDeploying ? 'Deploying...' : 'Deploy'}</span>
          </button>

          {/* Copy URL Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1F1E1D] text-white hover:bg-[#33302C] transition-colors cursor-pointer shadow-xs"
            title="Copy Preview URL"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy URL</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Preview Screen */}
        <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-auto bg-[#ECE8E1]/50">
          <div className={`transition-all duration-200 overflow-hidden bg-white ${getContainerStyle()}`}>
            <iframe
              key={iframeKey}
              ref={iframeRef}
              srcDoc={prepareHmrHtml(htmlCode || DEFAULT_STARTER_WEBAPP_HTML)}
              title={`Preview of ${cleanAppName}`}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-popups"
            />
          </div>
        </main>

        {/* Slide-out Source Code Inspector */}
        {showSourceCode && (
          <aside className="w-96 sm:w-[480px] h-full bg-[#1F1E1D] text-[#E0DCD5] border-l border-[#33302C] flex flex-col z-20 shrink-0 shadow-2xl">
            <div className="p-3 bg-[#151413] border-b border-[#2B2824] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Source Code (index.html)</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditingCode ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveCode}
                      className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                    >
                      Save & Run
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditableCode(htmlCode);
                        setIsEditingCode(false);
                      }}
                      className="px-2 py-1 rounded-md text-xs text-[#999] hover:text-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingCode(true)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#2B2824] hover:bg-[#38342E] text-white transition-colors cursor-pointer"
                  >
                    Edit Code
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSourceCode(false)}
                  className="p-1 rounded-md text-[#888] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 overflow-auto font-mono text-xs leading-relaxed">
              {isEditingCode ? (
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs outline-hidden resize-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="text-neutral-300 whitespace-pre-wrap">{htmlCode}</pre>
              )}
            </div>

            <div className="p-2.5 bg-[#151413] border-t border-[#2B2824] flex items-center justify-between text-[11px] text-[#888]">
              <span>Changes sync instantly across tabs</span>
              <button
                type="button"
                onClick={handleResetStarter}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Reset to Starter
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Domain & Hosting Configuration Modal (as requested by user) */}
      {showDomainModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D5D0C7] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1E1D]">Domain & Hosting Configuration</h3>
                  <p className="text-xs text-[#736E67]">Directly host your web app or link your custom domain</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDomainModal(false)}
                className="p-1.5 rounded-lg text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Default URL */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DC] space-y-1.5">
              <div className="text-[11px] font-semibold text-[#736E67] uppercase tracking-wider">
                Default Workspace Preview URL
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#1F1E1D] break-all select-all font-semibold">
                  {previewUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2 py-1 rounded-md text-xs font-semibold bg-white border border-[#D5D0C7] hover:bg-[#EFECE6] shrink-0"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Custom Domain Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1F1E1D]">
                Custom Domain (e.g. <span className="font-mono text-indigo-700">myapp.com</span>)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDomainInput}
                  onChange={(e) => {
                    setCustomDomainInput(e.target.value);
                    setDomainError(null);
                  }}
                  placeholder="yourbrand.com or app.yourbrand.com"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#D5D0C7] focus:outline-hidden focus:ring-2 focus:ring-[#1F1E1D]/20 focus:border-[#1F1E1D]"
                />
                <button
                  type="button"
                  onClick={handleAttachDomain}
                  disabled={isAttachingDomain || !customDomainInput.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1F1E1D] text-white hover:bg-[#33302C] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isAttachingDomain && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isAttachingDomain ? 'Attaching...' : 'Attach Domain'}</span>
                </button>
              </div>

              {domainError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Domain Configuration Notice:</strong>
                    <span>{domainError}</span>
                  </div>
                </div>
              )}

              {domainStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Domain <code className="font-mono">{domainStatus.domain}</code> attached via Vercel!</span>
                  </div>
                  {domainStatus.configured ? (
                    <p className="text-[11px] text-emerald-700">
                      Domain is active and successfully pointing to your deployment.
                    </p>
                  ) : (
                    <div className="text-[11px] space-y-1">
                      <p className="font-medium text-emerald-800">
                        Add the following DNS record at your domain registrar:
                      </p>
                      {domainStatus.verification && domainStatus.verification.length > 0 ? (
                        <div className="font-mono bg-white/80 p-2 rounded border border-emerald-300 text-[10px] space-y-1">
                          {domainStatus.verification.map((v, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="font-semibold">{v.type}: {v.domain}</span>
                              <span className="text-neutral-700">{v.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="font-mono bg-white/80 p-2 rounded border border-emerald-300 text-[10px]">
                          CNAME {domainStatus.domain} &rarr; cname.vercel-dns.com
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-[#736E67] leading-relaxed">
                Requires an active deployment and <code className="font-mono bg-neutral-200/60 px-1 rounded">VERCEL_TOKEN</code> configured. Click <strong>Deploy</strong> on the top bar before linking a domain.
              </p>
            </div>

            {/* Android App Compatible Roadmap Info */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Mobile Export Roadmap: Android & iOS Bundling</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Native APK bundling (Capacitor/PWA bridge) will let you download an installable Android build directly from this workspace.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E2DC]">
              <button
                type="button"
                onClick={() => setShowDomainModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#FAF8F5] border border-[#D5D0C7] text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Vercel Deployment Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#DDD8CF] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1E1D]">Deploy to Public Web</h3>
                  <p className="text-xs text-[#736E67]">Ship a live production instance via Vercel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="p-1.5 rounded-lg text-[#736E67] hover:bg-[#FAF8F5] hover:text-[#1F1E1D] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In Flight Loading State */}
            {isDeploying && (
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DC] flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#1F1E1D]">Creating Live Vercel Deployment...</div>
                  <p className="text-[11px] text-[#736E67] max-w-xs">
                    Packing source bundles and dispatching to Vercel Deployments REST API. This typically takes 2–5 seconds.
                  </p>
                </div>
              </div>
            )}

            {/* Success State with Real Live URL */}
            {!isDeploying && deployedUrl && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Live Deployment Ready!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Your web application is globally distributed and running on Vercel edge infrastructure.
                  </p>
                  <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-emerald-300">
                    <span className="font-mono text-xs text-indigo-700 font-semibold truncate select-all">
                      {deployedUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDeployUrl}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors shrink-0"
                    >
                      {copiedDeployUrl ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Open Live Site</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Error State */}
            {!isDeploying && deployError && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Deployment Verification Failed</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {deployError}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDeploy}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-[#E5E2DC]">
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#FAF8F5] border border-[#D5D0C7] text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
