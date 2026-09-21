'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus,
  MessageSquare,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Search,
  Sparkles,
  ChevronRight,
  Code2,
  Globe,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  Copy,
  Share2,
  Download,
  Check,
  X,
  AlertTriangle,
  FileText,
  FileCode,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { UserProfileSettings, UserWallet, WorkMode, ChatThread, BuildStack } from '@/lib/types';
import {
  slugifyAppName,
  DEFAULT_WEBAPP_NAME,
  ACTIVE_APP_NAME_KEY,
  getStoredBuildStack,
} from '@/lib/webapp-preview';
import BuildStackSelector, { BUILD_STACK_OPTIONS } from './BuildStackSelector';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  profile: UserProfileSettings;
  wallet: UserWallet;
  onOpenSettings: (tab?: any) => void;
  onNewChat: () => void;
  currentMode: WorkMode;
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  onPinThread: (threadId: string) => void;
  onDuplicateThread: (threadId: string) => void;
  onExportThread?: (threadId: string, format: 'markdown' | 'json') => void;
  onClearAllThreads?: () => void;
  user?: User | null;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
}

// Time store with cached snapshot to satisfy React 19 external time subscription rules
let cachedCurrentTime = 0;
const timeListeners = new Set<() => void>();
let timeIntervalId: ReturnType<typeof setInterval> | null = null;

const nowTimeStore = {
  subscribe(callback: () => void) {
    timeListeners.add(callback);
    if (timeListeners.size === 1) {
      if (typeof window !== 'undefined') {
        cachedCurrentTime = Date.now();
      }
      timeIntervalId = setInterval(() => {
        cachedCurrentTime = Date.now();
        timeListeners.forEach((listener) => listener());
      }, 30000);
    }
    return () => {
      timeListeners.delete(callback);
      if (timeListeners.size === 0 && timeIntervalId) {
        clearInterval(timeIntervalId);
        timeIntervalId = null;
      }
    };
  },
  getSnapshot(): number {
    if (cachedCurrentTime === 0 && typeof window !== 'undefined') {
      cachedCurrentTime = Date.now();
    }
    return cachedCurrentTime;
  },
  getServerSnapshot(): number {
    return 0;
  },
};

function formatRelativeTime(timestamp: number, refTime: number): string {
  if (!refTime) return '';
  const diffMs = Math.max(0, refTime - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  isOpen,
  onToggle,
  profile,
  wallet,
  onOpenSettings,
  onNewChat,
  currentMode,
  threads,
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onRenameThread,
  onPinThread,
  onDuplicateThread,
  onExportThread,
  onClearAllThreads,
  user,
  onOpenSignIn,
  onSignOut,
}: SidebarProps) {
  const currentTime = useSyncExternalStore(
    nowTimeStore.subscribe,
    nowTimeStore.getSnapshot,
    nowTimeStore.getServerSnapshot
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuThreadId, setOpenMenuThreadId] = useState<string | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [confirmDeleteThreadId, setConfirmDeleteThreadId] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Web App Preview State (Developer Mode)
  const [activeAppSlug, setActiveAppSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVE_APP_NAME_KEY);
      if (saved) return slugifyAppName(saved);
    }
    return DEFAULT_WEBAPP_NAME;
  });

  const [activeBuildStack, setActiveBuildStack] = useState<BuildStack>(() => {
    return getStoredBuildStack();
  });
  const [isStackSelectorOpen, setIsStackSelectorOpen] = useState(false);

  useEffect(() => {
    const handleStackChanged = (event: Event) => {
      const ce = event as CustomEvent<{ stack: BuildStack }>;
      if (ce.detail?.stack) {
        setActiveBuildStack(ce.detail.stack);
      }
    };
    window.addEventListener('alphanex-build-stack-changed', handleStackChanged);
    return () => {
      window.removeEventListener('alphanex-build-stack-changed', handleStackChanged);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_APP_NAME_KEY && e.newValue) {
        setActiveAppSlug(slugifyAppName(e.newValue));
      }
    };
    const handleCustom = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail?.appName) {
        setActiveAppSlug(slugifyAppName(ce.detail.appName));
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('alphanex-webapp-updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('alphanex-webapp-updated', handleCustom);
    };
  }, []);

  const sidebarOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://alphanexai.vercel.app';
  const sidebarPreviewUrl = `${sidebarOrigin}/workspace/${activeAppSlug}/preview`;

  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuThreadId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus input during rename
  useEffect(() => {
    if (editingThreadId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingThreadId]);

  // Toast timer helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Keyboard shortcut listener for sidebar toggle (Cmd+B / Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggle]);

  // Filtered threads by search query, with strict deduplication by ID to prevent duplicate React keys
  const filteredThreads = useMemo(() => {
    const seen = new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    return threads.filter((t) => {
      if (!t || !t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.snippet && t.snippet.toLowerCase().includes(q))
      );
    });
  }, [threads, searchQuery]);

  // Split into Pinned and Chronological Groups
  const pinnedThreads = filteredThreads.filter((t) => t.isPinned);
  const unpinnedThreads = filteredThreads.filter((t) => !t.isPinned);

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const todayThreads = unpinnedThreads.filter((t) =>
    currentTime > 0 ? currentTime - t.updatedAt < ONE_DAY : true
  );
  const yesterdayThreads = unpinnedThreads.filter(
    (t) =>
      currentTime > 0 &&
      currentTime - t.updatedAt >= ONE_DAY &&
      currentTime - t.updatedAt < 2 * ONE_DAY
  );
  const previous7DaysThreads = unpinnedThreads.filter(
    (t) =>
      currentTime > 0 &&
      currentTime - t.updatedAt >= 2 * ONE_DAY &&
      currentTime - t.updatedAt < 7 * ONE_DAY
  );
  const olderThreads = unpinnedThreads.filter(
    (t) => currentTime > 0 && currentTime - t.updatedAt >= 7 * ONE_DAY
  );

  // Actions
  const handleStartRename = (thread: ChatThread) => {
    setEditingThreadId(thread.id);
    setEditTitleValue(thread.title);
    setOpenMenuThreadId(null);
  };

  const handleSaveRename = (threadId: string) => {
    if (editTitleValue.trim()) {
      onRenameThread(threadId, editTitleValue.trim());
      showToast('Chat renamed');
    }
    setEditingThreadId(null);
  };

  const handleShareLink = (thread: ChatThread) => {
    const url = `${window.location.origin}/chat/${thread.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Share link copied to clipboard');
    } else {
      showToast(`Link: ${url}`);
    }
    setOpenMenuThreadId(null);
  };

  const handleExportMarkdown = (thread: ChatThread) => {
    let md = `# ${thread.title}\n\n`;
    md += `*Created on ${new Date(thread.createdAt).toLocaleString()} via AI Festa Studio*\n\n---\n\n`;
    thread.messages.forEach((msg) => {
      const roleName = msg.role === 'user' ? '👤 User' : `🤖 Assistant (${msg.modelId || 'Model'})`;
      md += `### ${roleName}\n\n${msg.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${thread.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as Markdown');
    setOpenMenuThreadId(null);
  };

  const handleExportJson = (thread: ChatThread) => {
    const jsonStr = JSON.stringify(thread, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${thread.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as JSON');
    setOpenMenuThreadId(null);
  };

  const renderThreadItem = (thread: ChatThread) => {
    const isActive = activeThreadId === thread.id;
    const isMenuOpen = openMenuThreadId === thread.id;
    const isEditing = editingThreadId === thread.id;

    if (isEditing) {
      return (
        <div
          key={thread.id}
          className="p-1.5 rounded-xl bg-white border border-[#1F1E1D] shadow-xs flex items-center gap-1.5"
        >
          <input
            ref={editInputRef}
            type="text"
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(thread.id);
              if (e.key === 'Escape') setEditingThreadId(null);
            }}
            className="flex-1 px-1.5 py-1 text-xs text-[#1F1E1D] bg-transparent outline-hidden font-medium"
            placeholder="Conversation title..."
          />
          <button
            type="button"
            onClick={() => handleSaveRename(thread.id)}
            className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
            title="Save title"
            aria-label="Save title"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingThreadId(null)}
            className="p-1 rounded-md text-[#736E67] hover:bg-[#EFECE6] transition-colors cursor-pointer"
            title="Cancel"
            aria-label="Cancel rename"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={thread.id}
        className={`group relative flex items-center justify-between rounded-xl transition-all select-none ${
          isActive
            ? 'bg-white border border-[#E5E2DC] shadow-xs text-[#1F1E1D]'
            : 'hover:bg-[#EFECE6]/75 border border-transparent text-[#55504A] hover:text-[#1F1E1D]'
        }`}
      >
        {/* Main Click Area to Select Thread */}
        <button
          type="button"
          onClick={() => onSelectThread(thread.id)}
          className="flex-1 p-2 text-left truncate cursor-pointer flex flex-col gap-0.5"
          title={thread.title}
        >
          <div className="flex items-center gap-1.5 truncate">
            {thread.isPinned && (
              <Pin className="w-3 h-3 text-amber-600 shrink-0 rotate-45" />
            )}
            <span
              className={`text-xs truncate ${
                isActive ? 'font-semibold text-[#1F1E1D]' : 'font-medium'
              }`}
            >
              {thread.title}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px] text-[#858079]">
            <span className="truncate max-w-[140px] opacity-85 font-normal">
              {thread.snippet || 'No messages yet'}
            </span>
            <span className="shrink-0 font-mono text-[9px]" suppressHydrationWarning>
              {formatRelativeTime(thread.updatedAt, currentTime)}
            </span>
          </div>
        </button>

        {/* Hover / Active Action Bar: Three Dots Menu */}
        <div className="shrink-0 pr-1.5">
          <div className="relative">
            <button
              id={`thread-menu-btn-${thread.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuThreadId(isMenuOpen ? null : thread.id);
              }}
              className={`p-1.5 rounded-lg text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#FAF8F5] transition-all cursor-pointer ${
                isMenuOpen || isActive
                  ? 'opacity-100 bg-[#FAF8F5]'
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              title="More chat actions"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Context Dropdown Menu */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-xl border border-[#E5E2DC] py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-[#1F1E1D]"
              >
                {/* Rename */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(thread);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#736E67]" />
                  <span>Rename</span>
                </button>

                {/* Pin / Unpin */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinThread(thread.id);
                    setOpenMenuThreadId(null);
                    showToast(thread.isPinned ? 'Chat unpinned' : 'Chat pinned to top');
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  {thread.isPinned ? (
                    <>
                      <PinOff className="w-3.5 h-3.5 text-[#736E67]" />
                      <span>Unpin from top</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pin to top</span>
                    </>
                  )}
                </button>

                {/* Duplicate */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateThread(thread.id);
                    setOpenMenuThreadId(null);
                    showToast('Chat duplicated');
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#736E67]" />
                  <span>Duplicate</span>
                </button>

                {/* Share Link */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareLink(thread);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#736E67]" />
                  <span>Share link</span>
                </button>

                <div className="my-1 border-t border-[#EAE6DF]" />

                {/* Export Markdown */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportMarkdown(thread);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#736E67]" />
                  <span>Export as Markdown</span>
                </button>

                {/* Export JSON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportJson(thread);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-[#736E67]" />
                  <span>Export as JSON</span>
                </button>

                <div className="my-1 border-t border-[#EAE6DF]" />

                {/* Delete Trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteThreadId(thread.id);
                    setOpenMenuThreadId(null);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Collapsed Sidebar Minimal Rail (Desktop)
  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center justify-between py-3 px-2 border-r border-[#E5E2DC] bg-[#FAF8F5] shrink-0 w-12 z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            id="sidebar-expand-btn"
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
            title="Expand Sidebar (Cmd+B)"
            aria-label="Expand Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <button
            id="sidebar-collapsed-new-chat-btn"
            type="button"
            onClick={onNewChat}
            className="p-1.5 rounded-lg bg-[#1F1E1D] text-white hover:bg-[#33302C] transition-colors cursor-pointer shadow-xs"
            title="New Chat (Ctrl+N)"
            aria-label="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {currentMode === 'developer' && (
            <a
              id="sidebar-collapsed-preview-btn"
              href={sidebarPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200"
              title={`Open Live WebApp Preview in New Tab (${sidebarPreviewUrl})`}
              aria-label="Web App Preview"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Collapsed Avatar Trigger */}
        <button
          id="sidebar-collapsed-profile-trigger"
          type="button"
          onClick={() => onOpenSettings('profile')}
          className="relative group p-1 rounded-full hover:ring-2 hover:ring-purple-500/40 transition-all cursor-pointer"
          title={`${profile.fullName} • Settings (Cmd+,)`}
          aria-label="Open User Settings"
        >
          <Image
            src={profile.avatarUrl}
            alt={profile.fullName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover border border-[#D5D0C7]"
            referrerPolicy="no-referrer"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
        </button>
      </div>
    );
  }

  return (
    <>
      <aside
        id="left-sidebar-navigation"
        className="w-64 md:w-68 flex flex-col justify-between h-full border-r border-[#E5E2DC] bg-[#FAF8F5] shrink-0 z-20 transition-all duration-200 select-none relative"
      >
        {/* Top Controls: Header, New Chat & Search */}
        <div className="p-3 border-b border-[#EAE6DF] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#1F1E1D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                F
              </div>
              <span className="text-xs font-bold text-[#1F1E1D] tracking-tight">
                AI Festa Studio
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded font-medium bg-[#EFECE6] text-[#736E67]">
                v2.5
              </span>
            </div>

            <button
              id="sidebar-collapse-btn"
              type="button"
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-[#EFECE6] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
              title="Collapse Sidebar (Cmd+B)"
              aria-label="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            id="sidebar-new-chat-btn"
            type="button"
            onClick={onNewChat}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E5E2DC] text-xs font-semibold text-[#1F1E1D] flex items-center justify-between shadow-2xs hover:border-[#D5D0C7] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#1F1E1D] group-hover:scale-110 transition-transform" />
              <span>New Chat</span>
            </div>
            <span className="text-[10px] font-mono text-[#858079] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5E2DC]">
              Ctrl+N
            </span>
          </button>

          {/* Quick Search with Clear */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#858079] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-search-threads-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E5E2DC] bg-white text-[11px] text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#858079] hover:text-[#1F1E1D] cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Developer Mode: Live Web App Preview Link Item */}
          {currentMode === 'developer' && (
            <div id="sidebar-developer-webapp-preview-box" className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/90 to-purple-50/50 border border-indigo-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    <Globe className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-[#1F1E1D]">Web App Preview</span>
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              <div className="text-[10px] font-mono text-[#55504A] truncate bg-white/80 px-2 py-1 rounded border border-indigo-100">
                /workspace/{activeAppSlug}/preview
              </div>

              <a
                id="sidebar-open-webapp-preview-link"
                href={sidebarPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-bold transition-colors shadow-xs"
                title={`Open build in new browser tab (${sidebarPreviewUrl})`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in New Tab</span>
              </a>
            </div>
          )}

          {/* Developer Mode: Build Stack Selector Collapsible Section */}
          {currentMode === 'developer' && (
            <div
              id="sidebar-build-stack-container"
              className="p-2.5 rounded-xl bg-white border border-[#E5E2DC] shadow-2xs space-y-2"
            >
              <button
                id="sidebar-toggle-build-stack-btn"
                type="button"
                onClick={() => setIsStackSelectorOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
                aria-label="Toggle Build Stack Selection"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Layers className="w-3 h-3 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1F1E1D] block leading-none">
                      Build Stack
                    </span>
                    <span className="text-[10px] text-[#736E67]">
                      {BUILD_STACK_OPTIONS.find((s) => s.id === activeBuildStack)?.label || 'HTML / CSS / JS'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-neutral-100 text-[#55504A]">
                    {activeBuildStack === 'react-native' || activeBuildStack === 'flutter'
                      ? 'Mobile'
                      : 'Web'}
                  </span>
                  {isStackSelectorOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#736E67]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#736E67]" />
                  )}
                </div>
              </button>

              {isStackSelectorOpen && (
                <div className="pt-2 border-t border-[#EAE6DF] animate-in fade-in duration-150">
                  <BuildStackSelector
                    currentStack={activeBuildStack}
                    onChangeStack={(stack) => setActiveBuildStack(stack)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Threads List (Grouped by Pinned, Today, Yesterday, Previous 7 Days, Older) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {filteredThreads.length === 0 ? (
            <div className="py-8 px-3 text-center text-[#858079]">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No chats found</p>
              <p className="text-[10px] opacity-75 mt-0.5">
                {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
              </p>
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedThreads.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5 rotate-45" />
                    <span>Pinned</span>
                  </div>
                  {pinnedThreads.map(renderThreadItem)}
                </div>
              )}

              {/* Today */}
              {todayThreads.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#858079]">
                    Today
                  </div>
                  {todayThreads.map(renderThreadItem)}
                </div>
              )}

              {/* Yesterday */}
              {yesterdayThreads.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#858079]">
                    Yesterday
                  </div>
                  {yesterdayThreads.map(renderThreadItem)}
                </div>
              )}

              {/* Previous 7 Days */}
              {previous7DaysThreads.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#858079]">
                    Previous 7 Days
                  </div>
                  {previous7DaysThreads.map(renderThreadItem)}
                </div>
              )}

              {/* Older */}
              {olderThreads.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#858079]">
                    Older
                  </div>
                  {olderThreads.map(renderThreadItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Optional Clear All Chats link if threads exist */}
        {threads.length > 1 && onClearAllThreads && (
          <div className="px-3 py-1.5 border-t border-[#EAE6DF] flex justify-between items-center text-[10px] text-[#858079]">
            <span>{threads.length} conversations</span>
            <button
              type="button"
              onClick={() => setIsConfirmingClearAll(true)}
              className="hover:text-red-600 transition-colors cursor-pointer"
              title="Clear all chat history"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Persistent User Profile & Name Widget Anchored at Bottom-Left */}
        <div
          id="sidebar-bottom-user-widget"
          className="p-2.5 border-t border-[#EAE6DF] bg-[#F5F2EC] flex items-center justify-between"
        >
          {user ? (
            <>
              <button
                id="sidebar-profile-user-trigger"
                type="button"
                onClick={() => onOpenSettings('profile')}
                className="flex-1 flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#EAE6DF] transition-all cursor-pointer text-left truncate group"
                title="Account Settings & Preferences (Cmd+,)"
              >
                <div className="relative shrink-0">
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-white shadow-2xs group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                </div>

                <div className="truncate flex-1">
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-xs font-bold text-[#1F1E1D] truncate group-hover:text-purple-900 transition-colors">
                      {profile.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#736E67]">
                    <span className="font-semibold text-emerald-800">{wallet.plan}</span>
                    <span>•</span>
                    <span className="font-mono text-[#858079]">{wallet.credits} Cr</span>
                  </div>
                </div>
              </button>

              {/* Quick Settings Gear Trigger Button */}
              <button
                id="sidebar-settings-gear-btn"
                type="button"
                onClick={() => onOpenSettings('profile')}
                className="p-2 rounded-lg hover:bg-[#EAE6DF] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer shrink-0 ml-1"
                title="Open Settings (Cmd+,)"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              id="sidebar-signin-btn"
              type="button"
              onClick={onOpenSignIn}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Sign in with Google or GitHub"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>

        {/* Floating Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[#1F1E1D] text-white text-[11px] font-medium shadow-lg z-50 flex items-center gap-1.5 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </aside>

      {/* Delete Single Chat Confirmation Dialog (Claude / ChatGPT style) */}
      {confirmDeleteThreadId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-[#FAF8F5] rounded-2xl border border-[#E5E2DC] shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F1E1D]">Delete chat?</h3>
                <p className="text-xs text-[#736E67]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#55504A] bg-white p-3 rounded-xl border border-[#E5E2DC] truncate">
              &quot;
              {threads.find((t) => t.id === confirmDeleteThreadId)?.title || 'Untitled chat'}
              &quot;
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteThreadId(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5E2DC] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteThread(confirmDeleteThreadId);
                  setConfirmDeleteThreadId(null);
                  showToast('Chat deleted');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Confirmation Dialog */}
      {isConfirmingClearAll && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-[#FAF8F5] rounded-2xl border border-[#E5E2DC] shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F1E1D]">Clear all chats?</h3>
                <p className="text-xs text-[#736E67]">All conversations will be deleted.</p>
              </div>
            </div>

            <p className="text-xs text-[#55504A]">
              This will permanently delete all your previous conversations, custom snippets, and chat history.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmingClearAll(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5E2DC] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllThreads) onClearAllThreads();
                  setIsConfirmingClearAll(false);
                  showToast('All chat history cleared');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
              >
                Clear all chats
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
