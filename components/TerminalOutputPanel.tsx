'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
  Search,
  Zap,
  Play,
  ArrowDown,
  ExternalLink,
  Code2,
  Layers,
  ChevronDown,
  ChevronRight,
  GripHorizontal,
} from 'lucide-react';
import {
  TerminalLogEntry,
  TerminalLogLevel,
  WebAppRuntimeStatus,
  slugifyAppName,
  getPreviewUrl,
} from '@/lib/webapp-preview';

interface TerminalOutputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  height?: number;
  onResizeHeight?: (height: number) => void;
  activeAppName: string;
  logs: TerminalLogEntry[];
  onClearLogs: () => void;
  onSimulateTestLog?: () => void;
  onEvalInSandbox?: (code: string) => void;
  runtimeStatus: WebAppRuntimeStatus;
}

export default function TerminalOutputPanel({
  isOpen,
  onClose,
  height = 240,
  onResizeHeight,
  activeAppName,
  logs,
  onClearLogs,
  onSimulateTestLog,
  onEvalInSandbox,
  runtimeStatus,
}: TerminalOutputPanelProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'errors' | 'warnings' | 'console' | 'build'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});
  const [evalInput, setEvalInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(height);

  // Auto-scroll to bottom on new logs if enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle resizing panel height
  const handleStartResize = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !onResizeHeight) return;
      const deltaY = startYRef.current - moveEvent.clientY;
      const nextHeight = Math.max(120, Math.min(window.innerHeight * 0.8, startHeightRef.current + deltaY));
      onResizeHeight(nextHeight);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Filter logs by category and search query
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedFilter === 'errors' && log.level !== 'error') return false;
      if (selectedFilter === 'warnings' && log.level !== 'warn') return false;
      if (selectedFilter === 'console' && !['log', 'info'].includes(log.level)) return false;
      if (selectedFilter === 'build' && !['build', 'hmr', 'system'].includes(log.level)) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msgMatch = log.message.toLowerCase().includes(query);
        const sourceMatch = log.source ? log.source.toLowerCase().includes(query) : false;
        return msgMatch || sourceMatch;
      }

      return true;
    });
  }, [logs, selectedFilter, searchQuery]);

  // Calculate statistics
  const errorCount = useMemo(() => logs.filter((l) => l.level === 'error').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'warn').length, [logs]);

  // Copy all terminal logs
  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        return `[${time}] [${l.level.toUpperCase()}] ${l.source ? `[${l.source}] ` : ''}${l.message}${
          l.stack ? `\n${l.stack}` : ''
        }`;
      })
      .join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleToggleStack = (id: string) => {
    setExpandedStacks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEvalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalInput.trim()) return;
    if (onEvalInSandbox) {
      onEvalInSandbox(evalInput);
    }
    setEvalInput('');
  };

  const cleanSlug = slugifyAppName(activeAppName);
  const previewUrl = getPreviewUrl(cleanSlug);

  if (!isOpen) return null;

  return (
    <div
      id="terminal-output-panel"
      className={`border-t border-[#262422] bg-[#121110] text-[#E0DCD5] flex flex-col z-30 transition-all shadow-2xl relative select-none font-sans ${
        isMaximized ? 'h-[75vh]' : ''
      }`}
      style={!isMaximized ? { height: `${height}px` } : undefined}
    >
      {/* Draggable Top Resize Handle */}
      {!isMaximized && (
        <div
          onPointerDown={handleStartResize}
          className="h-2 w-full bg-[#1A1816] hover:bg-[#2F2C27] transition-colors cursor-row-resize flex items-center justify-center group"
          title="Drag to resize terminal height"
        >
          <div className="w-12 h-1 rounded-full bg-[#3D3934] group-hover:bg-[#8C867D] transition-colors" />
        </div>
      )}

      {/* Terminal Header Bar */}
      <div className="h-10 bg-[#171615] border-b border-[#262422] px-3 flex items-center justify-between text-xs shrink-0">
        {/* Left: Terminal Title & Runtime Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Terminal Output</span>
          </div>

          {/* Runtime Status Pill */}
          <div
            id="terminal-runtime-status-pill"
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              runtimeStatus === 'compiling'
                ? 'bg-purple-950/70 text-purple-300 border-purple-800'
                : runtimeStatus === 'hot-reloading'
                ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                : runtimeStatus === 'error' || errorCount > 0
                ? 'bg-red-950/70 text-red-300 border-red-800'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                runtimeStatus === 'compiling'
                  ? 'bg-purple-400 animate-spin'
                  : runtimeStatus === 'hot-reloading'
                  ? 'bg-amber-400 animate-bounce'
                  : runtimeStatus === 'error' || errorCount > 0
                  ? 'bg-red-400'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>
              {runtimeStatus === 'compiling'
                ? 'Compiling...'
                : runtimeStatus === 'hot-reloading'
                ? 'HMR Reloading...'
                : runtimeStatus === 'error'
                ? 'Runtime Error'
                : errorCount > 0
                ? `${errorCount} Issues`
                : 'Sandbox Ready'}
            </span>
          </div>

          {/* App slug badge */}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 font-mono text-[11px] text-[#A69F94] hover:text-white transition-colors"
            title={`Open live app preview: ${previewUrl}`}
          >
            <span>{cleanSlug}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>

        {/* Center: Category Filter Tabs */}
        <div className="hidden lg:flex items-center bg-[#0D0C0B] p-0.5 rounded-md border border-[#2B2926]">
          <button
            id="terminal-filter-all"
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-[#2A2724] text-white font-semibold'
                : 'text-[#8C867D] hover:text-[#D5D0C7]'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            id="terminal-filter-errors"
            type="button"
            onClick={() => setSelectedFilter('errors')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              selectedFilter === 'errors'
                ? 'bg-red-950 text-red-300 font-semibold border border-red-800'
                : errorCount > 0
                ? 'text-red-400 font-semibold'
                : 'text-[#8C867D] hover:text-[#D5D0C7]'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Errors ({errorCount})</span>
          </button>
          <button
            id="terminal-filter-warnings"
            type="button"
            onClick={() => setSelectedFilter('warnings')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              selectedFilter === 'warnings'
                ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800'
                : warnCount > 0
                ? 'text-amber-400'
                : 'text-[#8C867D] hover:text-[#D5D0C7]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Warnings ({warnCount})</span>
          </button>
          <button
            id="terminal-filter-console"
            type="button"
            onClick={() => setSelectedFilter('console')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              selectedFilter === 'console'
                ? 'bg-[#2A2724] text-white font-semibold'
                : 'text-[#8C867D] hover:text-[#D5D0C7]'
            }`}
          >
            Console
          </button>
          <button
            id="terminal-filter-build"
            type="button"
            onClick={() => setSelectedFilter('build')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              selectedFilter === 'build'
                ? 'bg-[#2A2724] text-white font-semibold'
                : 'text-[#8C867D] hover:text-[#D5D0C7]'
            }`}
          >
            Build & HMR
          </button>
        </div>

        {/* Right: Search & Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Search */}
          <div className="relative hidden sm:flex items-center">
            <Search className="w-3 h-3 text-[#736E67] absolute left-2 pointer-events-none" />
            <input
              id="terminal-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter logs..."
              className="w-28 focus:w-44 transition-all pl-6 pr-2 py-0.5 text-[11px] bg-[#0D0C0B] border border-[#2B2926] rounded-md text-white placeholder-[#55504A] focus:outline-none focus:border-[#55504A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 text-[#736E67] hover:text-white"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Test Log / Diagnostics Button */}
          {onSimulateTestLog && (
            <button
              id="terminal-simulate-test-btn"
              type="button"
              onClick={onSimulateTestLog}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#22201D] hover:bg-[#33302C] text-[#C4BEB4] hover:text-white transition-colors cursor-pointer"
              title="Trigger runtime diagnostic test"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="hidden xl:inline">Test Ping</span>
            </button>
          )}

          {/* Auto-Scroll Toggle */}
          <button
            id="terminal-autoscroll-toggle-btn"
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-md text-[11px] transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-[#262421] text-emerald-400 font-bold'
                : 'text-[#736E67] hover:text-white hover:bg-[#1E1C1A]'
            }`}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
          </button>

          {/* Copy Logs */}
          <button
            id="terminal-copy-logs-btn"
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-md text-[#736E67] hover:text-white hover:bg-[#1E1C1A] transition-colors cursor-pointer"
            title="Copy filtered logs"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Logs */}
          <button
            id="terminal-clear-logs-btn"
            type="button"
            onClick={onClearLogs}
            className="p-1.5 rounded-md text-[#736E67] hover:text-red-400 hover:bg-[#1E1C1A] transition-colors cursor-pointer"
            title="Clear terminal logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            id="terminal-maximize-btn"
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-md text-[#736E67] hover:text-white hover:bg-[#1E1C1A] transition-colors cursor-pointer"
            title={isMaximized ? 'Restore height' : 'Maximize terminal'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Panel */}
          <button
            id="terminal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#736E67] hover:text-white hover:bg-[#1E1C1A] transition-colors cursor-pointer"
            title="Close terminal output panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport / Scroll Area */}
      <div
        id="terminal-log-stream"
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1 select-text bg-[#0F0E0D]"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#55504A] space-y-2 py-8">
            <Code2 className="w-8 h-8 opacity-40" />
            <div className="text-xs font-medium">No logs to display</div>
            <div className="text-[11px] max-w-sm text-center opacity-70">
              Console output, compilation messages, syntax errors, and HMR events from the generated application will appear here.
            </div>
            {onSimulateTestLog && (
              <button
                type="button"
                onClick={onSimulateTestLog}
                className="mt-2 px-3 py-1 rounded bg-[#1F1D1B] hover:bg-[#2B2824] text-xs text-white border border-[#33302C] transition-colors cursor-pointer"
              >
                Send Test Diagnostics
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const isErr = log.level === 'error';
            const isWarn = log.level === 'warn';
            const isHmr = log.level === 'hmr';
            const isBuild = log.level === 'build';
            const isSystem = log.level === 'system';
            const hasStack = Boolean(log.stack);
            const isExpanded = Boolean(expandedStacks[log.id]);

            return (
              <div
                key={log.id}
                className={`flex flex-col rounded px-2 py-0.5 transition-colors ${
                  isErr
                    ? 'bg-red-950/40 text-red-200 border-l-2 border-red-500 hover:bg-red-950/60'
                    : isWarn
                    ? 'bg-amber-950/30 text-amber-200 border-l-2 border-amber-500 hover:bg-amber-950/50'
                    : isHmr
                    ? 'text-emerald-300 hover:bg-[#1A1816]'
                    : isBuild
                    ? 'text-purple-300 hover:bg-[#1A1816]'
                    : isSystem
                    ? 'text-cyan-300 hover:bg-[#1A1816]'
                    : 'text-[#D5D0C7] hover:bg-[#1A1816]'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Timestamp */}
                  <span className="text-[#666057] shrink-0 font-mono text-[10px] select-none pt-0.5">
                    {time}
                  </span>

                  {/* Level Tag */}
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase shrink-0 tracking-wider select-none ${
                      isErr
                        ? 'bg-red-900/80 text-red-200 border border-red-700'
                        : isWarn
                        ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                        : isHmr
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : isBuild
                        ? 'bg-purple-950 text-purple-400 border border-purple-800'
                        : isSystem
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        : 'bg-[#22201D] text-[#8C867D]'
                    }`}
                  >
                    {log.level}
                  </span>

                  {/* Source Tag if present */}
                  {log.source && (
                    <span className="text-[#888177] shrink-0 font-sans text-[10px] select-none">
                      [{log.source}]
                    </span>
                  )}

                  {/* Log Message */}
                  <div className="flex-1 break-all whitespace-pre-wrap">{log.message}</div>

                  {/* Expand Stack Trace toggle button if available */}
                  {hasStack && (
                    <button
                      type="button"
                      onClick={() => handleToggleStack(log.id)}
                      className="text-[#888] hover:text-white text-[10px] flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded bg-black/30 cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>Stack</span>
                    </button>
                  )}
                </div>

                {/* Expanded Stack Trace */}
                {hasStack && isExpanded && (
                  <div className="mt-1 ml-16 p-2 rounded bg-black/60 border border-red-900/50 text-[10px] text-red-300 font-mono overflow-x-auto whitespace-pre">
                    {log.stack}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Command & Eval Bar */}
      <form
        onSubmit={handleEvalSubmit}
        className="h-8 bg-[#151413] border-t border-[#262422] px-3 flex items-center gap-2 text-xs shrink-0"
      >
        <span className="text-emerald-400 font-bold font-mono select-none">&gt;</span>
        <input
          id="terminal-eval-input"
          type="text"
          value={evalInput}
          onChange={(e) => setEvalInput(e.target.value)}
          placeholder="Evaluate JavaScript in sandbox (e.g. console.log(document.title) or alert('hi'))..."
          className="flex-1 bg-transparent text-[#E0DCD5] font-mono text-[11px] placeholder-[#4D4843] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!evalInput.trim()}
          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2B2824] hover:bg-[#3D3A35] disabled:opacity-30 text-white transition-colors cursor-pointer"
        >
          Run
        </button>
      </form>
    </div>
  );
}
