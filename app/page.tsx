'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { ChevronRight, ChevronLeft, PanelRight, GripVertical } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import CanvasDrawer from '@/components/CanvasDrawer';
import ParameterDrawer from '@/components/ParameterDrawer';
import PaymentModal from '@/components/PaymentModal';
import SettingsModal, { SettingsTabId } from '@/components/settings/SettingsModal';
import {
  WorkMode,
  ModelInfo,
  ReasoningEffort,
  ChatMessage,
  WorkspaceParams,
  UserWallet,
  DiffData,
  ModelTier,
  ChatThread,
  UserProfileSettings,
} from '@/lib/types';
import {
  AVAILABLE_MODELS,
  INITIAL_WORKSPACE_PARAMS,
  DEFAULT_SYSTEM_INSTRUCTIONS,
  INITIAL_DIFF_SAMPLE,
} from '@/lib/constants';
import {
  INITIAL_USER_PROFILE,
  INITIAL_THREADS,
  getStoredThreads,
  saveStoredThreads,
  deleteStoredThread,
  renameStoredThread,
  togglePinStoredThread,
  duplicateStoredThread,
  createStoredThread,
  updateStoredThreadMessages,
  clearAllStoredThreads,
  getStoredProfile,
  saveStoredProfile,
} from '@/lib/supabase';

const CANVAS_WIDTH_STORAGE_KEY = 'ai_festa_canvas_width_px';

// Dedicated external store for resizable canvas width ensuring zero SSR hydration mismatches
const canvasWidthStore = {
  listeners: new Set<() => void>(),
  cachedWidth: null as number | null,
  subscribe(callback: () => void) {
    canvasWidthStore.listeners.add(callback);
    return () => {
      canvasWidthStore.listeners.delete(callback);
    };
  },
  getSnapshot(): number {
    if (canvasWidthStore.cachedWidth !== null) {
      return canvasWidthStore.cachedWidth;
    }
    let initialWidth = 540;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CANVAS_WIDTH_STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 260 && parsed <= 1200) {
            initialWidth = parsed;
          }
        }
      } catch {}
    }
    canvasWidthStore.cachedWidth = initialWidth;
    return initialWidth;
  },
  getServerSnapshot(): number {
    return 540;
  },
  setWidth(width: number) {
    canvasWidthStore.cachedWidth = width;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CANVAS_WIDTH_STORAGE_KEY, width.toString());
      } catch {}
    }
    canvasWidthStore.listeners.forEach((listener) => listener());
  },
};

export default function WorkspacePage() {
  // Mode State
  const [currentMode, setCurrentMode] = useState<WorkMode>('developer');

  // Model State
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(
    AVAILABLE_MODELS.find((m) => m.id === 'claude-3-7-sonnet') || AVAILABLE_MODELS[0]
  );

  // Reasoning Effort State
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('Medium');

  // Workspace Parameters State (Google AI Studio style)
  const [workspaceParams, setWorkspaceParams] = useState<WorkspaceParams>(
    INITIAL_WORKSPACE_PARAMS
  );

  // User Profile & Settings Modal State
  const [userProfile, setUserProfile] = useState<UserProfileSettings>(INITIAL_USER_PROFILE);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('profile');

  // Sidebar & Threads State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    INITIAL_THREADS[0]?.id || null
  );

  // User Wallet State
  const [wallet, setWallet] = useState<UserWallet>({
    credits: 420,
    plan: 'Pro Builder',
    totalTokensUsed: 142050,
    planTokenLimit: 2500000,
  });

  // UI Panels State
  const [isParameterDrawerOpen, setIsParameterDrawerOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(true);
  
  // Canvas width synced via useSyncExternalStore to eliminate hydration mismatch
  const canvasWidthPx = useSyncExternalStore(
    canvasWidthStore.subscribe,
    canvasWidthStore.getSnapshot,
    canvasWidthStore.getServerSnapshot
  );

  const setCanvasWidthPx = useCallback((val: number | ((prev: number) => number)) => {
    const nextVal =
      typeof val === 'function' ? val(canvasWidthStore.getSnapshot()) : val;
    canvasWidthStore.setWidth(nextVal);
  }, []);

  const [isCanvasFullWidth, setIsCanvasFullWidth] = useState(false);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [snapFeedback, setSnapFeedback] = useState<'none' | 'collapse' | 'full'>('none');
  const [dragLiveWidth, setDragLiveWidth] = useState<number>(540);
  const [dragContainerWidth, setDragContainerWidth] = useState<number>(1200);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [intendedTier, setIntendedTier] = useState<ModelTier | undefined>(undefined);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'canvas'>('chat');

  // References for layout measuring and active drag tracking
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    startX: number;
    startWidth: number;
    containerWidth: number;
    containerRight: number;
    isFullWidthStart: boolean;
    lastProposedWidth: number;
  }>({
    startX: 0,
    startWidth: 540,
    containerWidth: 1200,
    containerRight: 1200,
    isFullWidthStart: false,
    lastProposedWidth: 540,
  });

  // Canvas Active Data
  const [activeDiffData, setActiveDiffData] = useState<DiffData | null>(INITIAL_DIFF_SAMPLE);
  const [customCodeSnippet, setCustomCodeSnippet] = useState<string | undefined>(undefined);

  // Chat Messages & Streaming State initialized from active thread
  const [messages, setMessages] = useState<ChatMessage[]>(
    INITIAL_THREADS[0]?.messages || []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  // Safely hydrate client-side persisted state (profile, chat history) after mount to prevent SSR hydration mismatch
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      // 1. Sync stored profile
      const storedProfile = getStoredProfile();
      setUserProfile(storedProfile);

      // 2. Sync stored threads and restore active chat state
      const storedThreads = getStoredThreads();
      if (storedThreads && storedThreads.length > 0) {
        setThreads(storedThreads);
        const activeId = storedThreads[0].id;
        setActiveThreadId(activeId);
        setMessages(storedThreads[0].messages || []);
        if (storedThreads[0].mode) {
          setCurrentMode(storedThreads[0].mode);
        }
        const foundDiff = storedThreads[0].messages.find((m) => m.diffData)?.diffData;
        if (foundDiff) {
          setActiveDiffData(foundDiff);
        }
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  // Mode Switch Handler (updates default system instruction)
  const handleChangeMode = (newMode: WorkMode) => {
    setCurrentMode(newMode);
    setWorkspaceParams((prev) => ({
      ...prev,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS[newMode],
      groundingEnabled: newMode === 'researcher' ? true : prev.groundingEnabled,
    }));
  };

  // Model Select Handler
  const handleSelectModel = (model: ModelInfo) => {
    setSelectedModel(model);
  };

  // Open Payment Modal with specific intended tier if locked
  const handleOpenPaymentModal = (tier?: ModelTier) => {
    setIntendedTier(tier);
    setIsPaymentModalOpen(true);
  };

  // Payment Success Handler
  const handlePaymentSuccess = (addedCredits: number, newPlan?: 'Starter' | 'Pro Builder') => {
    setWallet((prev) => ({
      ...prev,
      credits: prev.credits + addedCredits,
      plan: newPlan || prev.plan,
    }));
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Select Thread from Sidebar
  const handleSelectThread = (threadId: string) => {
    const target = threads.find((t) => t.id === threadId);
    if (!target) return;
    setActiveThreadId(threadId);
    setMessages(target.messages || []);
    setCurrentMode(target.mode || 'developer');

    // If thread has diffData in any message, load into canvas
    const foundDiff = target.messages.find((m) => m.diffData)?.diffData;
    if (foundDiff) {
      setActiveDiffData(foundDiff);
    }
  };

  // Start fresh new chat
  const handleNewChat = () => {
    setActiveThreadId(null);
    setMessages([]);
    setCustomCodeSnippet(undefined);
  };

  // Delete a thread
  const handleDeleteThread = (threadId: string) => {
    const updated = deleteStoredThread(threadId);
    setThreads(updated);

    if (activeThreadIdRef.current === threadId) {
      if (updated.length > 0) {
        handleSelectThread(updated[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  // Rename a thread
  const handleRenameThread = (threadId: string, newTitle: string) => {
    const updated = renameStoredThread(threadId, newTitle);
    setThreads(updated);
  };

  // Pin / Unpin a thread
  const handlePinThread = (threadId: string) => {
    const updated = togglePinStoredThread(threadId);
    setThreads(updated);
  };

  // Duplicate a thread
  const handleDuplicateThread = (threadId: string) => {
    const { threads: updated, duplicated } = duplicateStoredThread(threadId);
    setThreads(updated);
    if (duplicated) {
      handleSelectThread(duplicated.id);
    }
  };

  // Clear all chats
  const handleClearAllThreads = () => {
    clearAllStoredThreads();
    setThreads([]);
    handleNewChat();
  };

  // Global keyboard shortcuts and storage event sync
  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      if (e.detail) setUserProfile(e.detail);
    };
    const handleThreadsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        const seen = new Set<string>();
        const unique = e.detail.filter((t: ChatThread) => {
          if (!t || !t.id || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        setThreads(unique);
      }
    };
    window.addEventListener('ai_festa_profile_updated', handleProfileUpdated);
    window.addEventListener('ai_festa_threads_updated', handleThreadsUpdated);

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Cmd+, or Ctrl+, -> Open Settings Modal
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsModalOpen((prev) => !prev);
      }
      // Cmd+Shift+O or Ctrl+N -> New Chat
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o')
      ) {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);

    return () => {
      window.removeEventListener('ai_festa_profile_updated', handleProfileUpdated);
      window.removeEventListener('ai_festa_threads_updated', handleThreadsUpdated);
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

  // Send Message with SSE Stream
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    // Check credits if model costs credits
    if (selectedModel.costPerQueryCredits > 0 && wallet.credits < selectedModel.costPerQueryCredits) {
      handleOpenPaymentModal('vault');
      return;
    }

    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${randomSuffix}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      mode: currentMode,
      modelId: selectedModel.id,
    };

    // Ensure we have an active thread or generate a new one
    let targetThreadId = activeThreadIdRef.current;
    if (!targetThreadId) {
      const title = userText.length > 38 ? `${userText.slice(0, 36).trim()}...` : userText.trim();
      const newThread = createStoredThread(title, currentMode, selectedModel.id, [userMessage]);
      targetThreadId = newThread.id;
      setActiveThreadId(targetThreadId);
      setThreads((prev) => {
        if (prev.some((t) => t.id === newThread.id)) return prev;
        return [newThread, ...prev];
      });
    }

    const assistantMsgId = `asst-${Date.now()}-${randomSuffix}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      mode: currentMode,
      modelId: selectedModel.id,
      reasoningEffort: selectedModel.supportsThinking ? reasoningEffort : undefined,
      isThinking: selectedModel.supportsThinking,
      thinkingContent: '',
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`/api/chat/${currentMode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userText,
          mode: currentMode,
          modelId: selectedModel.id,
          reasoningEffort: selectedModel.supportsThinking ? reasoningEffort : undefined,
          params: workspaceParams,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawJson = line.slice(6);
            try {
              const data = JSON.parse(rawJson);

              if (data.type === 'thinking') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          isThinking: true,
                          thinkingContent:
                            (msg.thinkingContent ? msg.thinkingContent + '\n' : '') +
                            data.content,
                        }
                      : msg
                  )
                );
              } else if (data.type === 'content') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          isThinking: false,
                          content: msg.content + data.content,
                        }
                      : msg
                  )
                );
              } else if (data.type === 'citations') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          citations: data.citations,
                        }
                      : msg
                  )
                );
              } else if (data.type === 'diff') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          diffData: data.diff,
                        }
                      : msg
                  )
                );
                // Also update Canvas
                setActiveDiffData(data.diff);
              } else if (data.type === 'error') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          isThinking: false,
                          content:
                            msg.content ||
                            `Notice: ${
                              typeof data.error === 'string'
                                ? data.error
                                : 'Model stream timed out. Please retry or choose a different model tier.'
                            }`,
                        }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                setIsStreaming(false);
                // Deduct credits if applicable
                if (selectedModel.costPerQueryCredits > 0) {
                  setWallet((prev) => ({
                    ...prev,
                    credits: Math.max(0, prev.credits - selectedModel.costPerQueryCredits),
                    totalTokensUsed: prev.totalTokensUsed + (data.tokens?.totalTokens || 500),
                  }));
                }
              }
            } catch (err) {
              console.error('Error parsing SSE chunk:', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Streaming request error:', err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  isThinking: false,
                  content:
                    msg.content ||
                    'An error occurred while streaming response. Please verify parameters or retry.',
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      if (targetThreadId) {
        setMessages((latest) => {
          updateStoredThreadMessages(targetThreadId, latest);
          setThreads(getStoredThreads());
          return latest;
        });
      }
    }
  };

  // Open diff or custom code snippet in Canvas
  const handleOpenInCanvas = (diff?: DiffData, code?: string) => {
    if (diff) {
      setActiveDiffData(diff);
    }
    if (code) {
      setCustomCodeSnippet(code);
    }
    setIsCanvasOpen(true);
    setActiveMobileTab('canvas');
  };

  // Divider Mouse/Pointer Drag Resize Handler
  const handleStartDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary mouse button
    e.preventDefault();

    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const containerWidth = rect.width;
    const containerRight = rect.right;
    const initialWidth = isCanvasFullWidth ? containerWidth : canvasWidthPx;

    dragInfoRef.current = {
      startX: e.clientX,
      startWidth: initialWidth,
      containerWidth,
      containerRight,
      isFullWidthStart: isCanvasFullWidth,
      lastProposedWidth: initialWidth,
    };

    setIsDraggingDivider(true);
    setDragLiveWidth(initialWidth);
    setDragContainerWidth(containerWidth);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const { containerRight: cRight, containerWidth: cWidth } = dragInfoRef.current;
      const proposedWidth = cRight - moveEvent.clientX;
      dragInfoRef.current.lastProposedWidth = proposedWidth;

      // Threshold boundaries
      const collapseThreshold = Math.min(200, cWidth * 0.18);
      const fullThreshold = Math.max(cWidth - 220, cWidth * 0.82);

      if (proposedWidth <= collapseThreshold) {
        setSnapFeedback('collapse');
        setDragLiveWidth(proposedWidth);
      } else if (proposedWidth >= fullThreshold) {
        setSnapFeedback('full');
        setDragLiveWidth(cWidth);
      } else {
        setSnapFeedback('none');
        const clamped = Math.max(260, Math.min(proposedWidth, cWidth - 200));
        setDragLiveWidth(clamped);
        setCanvasWidthPx(clamped);
        setIsCanvasFullWidth(false);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      setIsDraggingDivider(false);

      const { lastProposedWidth: lastW, containerWidth: cWidth } = dragInfoRef.current;
      const collapseThreshold = Math.min(200, cWidth * 0.18);
      const fullThreshold = Math.max(cWidth - 220, cWidth * 0.82);

      if (lastW <= collapseThreshold) {
        // Snap to collapse!
        setIsCanvasOpen(false);
        setIsCanvasFullWidth(false);
        setSnapFeedback('none');
      } else if (lastW >= fullThreshold) {
        // Snap to full width!
        setIsCanvasFullWidth(true);
        setIsCanvasOpen(true);
        setSnapFeedback('none');
      } else {
        // Regular dynamic width release
        const clamped = Math.max(260, Math.min(lastW, cWidth - 200));
        setCanvasWidthPx(clamped);
        setIsCanvasFullWidth(false);
        setIsCanvasOpen(true);
        setSnapFeedback('none');
        try {
          localStorage.setItem('ai_festa_canvas_width_px', String(clamped));
        } catch {}
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { once: true });
    window.addEventListener('pointercancel', onPointerUp, { once: true });
  };

  // Double click divider to reset to standard width
  const handleDividerDoubleClick = () => {
    if (isCanvasFullWidth) {
      setIsCanvasFullWidth(false);
    } else {
      const rect = workspaceRef.current?.getBoundingClientRect();
      const defaultWidth = rect ? Math.round(rect.width * 0.45) : 520;
      setCanvasWidthPx(defaultWidth);
      try {
        localStorage.setItem('ai_festa_canvas_width_px', String(defaultWidth));
      } catch {}
    }
  };

  // Cycle width presets (compact -> standard -> wide -> compact)
  const handleCycleWidth = () => {
    if (isCanvasFullWidth) {
      setIsCanvasFullWidth(false);
      setCanvasWidthPx(520);
      return;
    }
    if (canvasWidthPx < 440) {
      setCanvasWidthPx(520);
    } else if (canvasWidthPx < 640) {
      setCanvasWidthPx(720);
    } else {
      setCanvasWidthPx(380);
    }
  };

  // Toggle full width state
  const handleToggleFullWidth = () => {
    setIsCanvasFullWidth((prev) => !prev);
    if (!isCanvasOpen) {
      setIsCanvasOpen(true);
    }
  };

  return (
    <div
      id="workspace-root"
      className="min-h-screen h-screen flex flex-col bg-[#FBF9F5] text-[#1F1E1D] overflow-hidden"
    >
      {/* Platform Header */}
      <Header
        currentMode={currentMode}
        onChangeMode={handleChangeMode}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        reasoningEffort={reasoningEffort}
        onChangeEffort={setReasoningEffort}
        wallet={wallet}
        onOpenPaymentModal={handleOpenPaymentModal}
        isParameterDrawerOpen={isParameterDrawerOpen}
        onToggleParameterDrawer={() => setIsParameterDrawerOpen(!isParameterDrawerOpen)}
        isCanvasOpen={isCanvasOpen}
        onToggleCanvas={() => {
          setIsCanvasOpen(!isCanvasOpen);
          if (!isCanvasOpen) setIsCanvasFullWidth(false);
        }}
        activeMobileTab={activeMobileTab}
        onChangeMobileTab={setActiveMobileTab}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenSettings={() => {
          setSettingsInitialTab('profile');
          setIsSettingsModalOpen(true);
        }}
        profile={userProfile}
      />

      {/* Main Workspace Layout with Left Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          profile={userProfile}
          wallet={wallet}
          onOpenSettings={(tab) => {
            setSettingsInitialTab(tab || 'profile');
            setIsSettingsModalOpen(true);
          }}
          onNewChat={handleNewChat}
          currentMode={currentMode}
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          onPinThread={handlePinThread}
          onDuplicateThread={handleDuplicateThread}
          onClearAllThreads={handleClearAllThreads}
        />

        {/* Main Dual-Pane Workspace */}
        <main id="workspace-main" ref={workspaceRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Pane (Chat Stream) - expands smoothly or hides when Canvas is snapped to full width */}
        <div
          className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-200 ${
            activeMobileTab === 'canvas'
              ? 'hidden md:flex'
              : isCanvasFullWidth && isCanvasOpen
              ? 'hidden'
              : 'flex'
          }`}
        >
          <ChatArea
            messages={messages}
            currentMode={currentMode}
            selectedModel={selectedModel}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onOpenInCanvas={handleOpenInCanvas}
            onSelectPrompt={(text) => handleSendMessage(text)}
            userCredits={wallet.credits}
          />
        </div>

        {/* Resizable Draggable Divider between Chat and Canvas (Desktop) */}
        {isCanvasOpen && (
          <div
            id="canvas-resizable-divider"
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={isCanvasFullWidth ? 100 : Math.round(canvasWidthPx)}
            aria-valuemin={260}
            aria-valuemax={1200}
            aria-valuetext={isCanvasFullWidth ? 'Full Width' : `${Math.round(canvasWidthPx)}px`}
            onPointerDown={handleStartDrag}
            onDoubleClick={handleDividerDoubleClick}
            className={`relative hidden md:flex items-center justify-center cursor-col-resize select-none shrink-0 z-20 group transition-colors duration-150 ${
              isDraggingDivider
                ? snapFeedback === 'collapse'
                  ? 'w-3.5 bg-amber-400'
                  : snapFeedback === 'full'
                  ? 'w-3.5 bg-blue-500'
                  : 'w-3.5 bg-[#1F1E1D]'
                : 'w-2 hover:w-2.5 bg-[#E5E2DC] hover:bg-[#C8C2B7]'
            }`}
            title="Drag to resize Canvas. Drag left to snap Full Width. Drag right to Collapse. Double-click to reset."
          >
            {/* Visual centerline indicator */}
            <div
              className={`w-0.5 h-full transition-colors ${
                isDraggingDivider
                  ? 'bg-white opacity-90'
                  : 'bg-[#D5D0C7] group-hover:bg-[#8C867D]'
              }`}
            />

            {/* Center Drag Grip Handle + Quick Collapse Toggle Button */}
            <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none">
              <div
                className={`flex items-center justify-center rounded-full shadow-xs border transition-all ${
                  isDraggingDivider
                    ? snapFeedback === 'collapse'
                      ? 'w-6 h-12 bg-amber-500 text-white border-amber-600 scale-110 shadow-md'
                      : snapFeedback === 'full'
                      ? 'w-6 h-12 bg-blue-600 text-white border-blue-700 scale-110 shadow-md'
                      : 'w-6 h-12 bg-[#1F1E1D] text-white border-black scale-110 shadow-md'
                    : 'w-5 h-12 bg-[#FAF8F4] text-[#736E67] border-[#D5D0C7] group-hover:text-[#1F1E1D] group-hover:border-[#A8A196] group-hover:shadow-sm'
                }`}
              >
                {isDraggingDivider ? (
                  snapFeedback === 'collapse' ? (
                    <ChevronRight className="w-4 h-4 animate-pulse" />
                  ) : snapFeedback === 'full' ? (
                    <ChevronLeft className="w-4 h-4 animate-pulse" />
                  ) : (
                    <GripVertical className="w-3.5 h-3.5" />
                  )
                ) : (
                  <div className="flex flex-col items-center pointer-events-auto">
                    {/* 1-click collapse chevron */}
                    <button
                      type="button"
                      id="border-collapse-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCanvasOpen(false);
                        setIsCanvasFullWidth(false);
                      }}
                      className="w-4 h-5 flex items-center justify-center hover:text-red-600 transition-colors cursor-pointer"
                      title="Click to collapse Canvas panel"
                      aria-label="Collapse Canvas"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {/* Grip dots */}
                    <div className="flex flex-col gap-0.5 opacity-60">
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span className="w-1 h-1 rounded-full bg-current" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Width / Snap Tooltip Pill while dragging */}
            {isDraggingDivider && (
              <div
                className={`absolute top-6 z-50 px-2.5 py-1 rounded-md text-xs font-mono font-medium shadow-md pointer-events-none whitespace-nowrap transition-all animate-in fade-in zoom-in-95 duration-100 ${
                  snapFeedback === 'collapse'
                    ? 'bg-amber-600 text-white translate-x-2'
                    : snapFeedback === 'full'
                    ? 'bg-blue-600 text-white -translate-x-2'
                    : 'bg-[#1F1E1D] text-white -translate-x-1/2 left-1/2'
                }`}
              >
                {snapFeedback === 'collapse' && '⇥ Release to Collapse'}
                {snapFeedback === 'full' && '⇤ Release for Full Width'}
                {snapFeedback === 'none' && (
                  <span className="flex items-center gap-1.5">
                    <span>{Math.round(dragLiveWidth)}px</span>
                    <span className="opacity-70 text-[10px]">
                      ({Math.round((dragLiveWidth / (dragContainerWidth || 1200)) * 100)}%)
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Pane (Collapsible Canvas & Sandbox) - shown on desktop if isCanvasOpen or on mobile if activeMobileTab is 'canvas' */}
        <div
          className={`${
            activeMobileTab === 'canvas'
              ? 'flex flex-1 md:flex-initial'
              : isCanvasOpen
              ? 'hidden md:flex'
              : 'hidden'
          } ${isCanvasFullWidth ? 'flex-1 w-full' : ''}`}
        >
          <CanvasDrawer
            isOpen={isCanvasOpen || activeMobileTab === 'canvas'}
            onClose={() => {
              setIsCanvasOpen(false);
              setIsCanvasFullWidth(false);
              setActiveMobileTab('chat');
            }}
            canvasWidth={
              isCanvasFullWidth
                ? 'wide'
                : canvasWidthPx <= 420
                ? 'compact'
                : canvasWidthPx >= 650
                ? 'wide'
                : 'standard'
            }
            widthPx={canvasWidthPx}
            isFullWidth={isCanvasFullWidth}
            isDragging={isDraggingDivider}
            onToggleFullWidth={handleToggleFullWidth}
            onCycleWidth={handleCycleWidth}
            diffData={activeDiffData}
            customCodeSnippet={customCodeSnippet}
            currentMode={currentMode}
            citations={
              [...messages]
                .reverse()
                .find((m) => m.citations && m.citations.length > 0)?.citations || []
            }
            latestAssistantMessage={
              [...messages]
                .reverse()
                .find((m) => m.role === 'assistant' && !m.isThinking)?.content || ''
            }
          />
        </div>

        {/* Quick-Access Floating Tab to Reopen Canvas when collapsed or closed */}
        {!isCanvasOpen && (
          <button
            id="reopen-canvas-toggle-tab"
            type="button"
            onClick={() => {
              setIsCanvasOpen(true);
              setIsCanvasFullWidth(false);
              setActiveMobileTab('canvas');
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 py-3.5 px-2 rounded-l-xl bg-[#FAF8F4] hover:bg-[#F3EFEA] border-l-2 border-t border-b border-l-blue-600 border-[#D5D0C7] shadow-lg text-[#1F1E1D] transition-all group cursor-pointer animate-in fade-in slide-in-from-right-2 duration-150"
            title="Quick Toggle: Reopen Canvas Panel"
            aria-label="Reopen Canvas Panel"
          >
            <ChevronLeft className="w-4 h-4 text-[#736E67] group-hover:text-[#1F1E1D] group-hover:-translate-x-0.5 transition-transform" />
            <div className="flex flex-col items-center gap-1">
              <PanelRight className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#55504A] group-hover:text-[#1F1E1D] [writing-mode:vertical-lr] rotate-180">
                {currentMode === 'developer'
                  ? 'Dev Canvas'
                  : currentMode === 'researcher'
                  ? 'Sources'
                  : 'Canvas'}
              </span>
            </div>
          </button>
        )}

        {/* Google AI Studio Parameter Inspector Drawer (Collapsible Right/Bottom) */}
        <ParameterDrawer
          isOpen={isParameterDrawerOpen}
          onClose={() => setIsParameterDrawerOpen(false)}
          params={workspaceParams}
          onChangeParams={setWorkspaceParams}
          currentMode={currentMode}
          selectedModel={selectedModel}
        />
      </main>
    </div>

      {/* Localized Nepali Payment & Credit Top-Up Modal (eSewa & Khalti) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        wallet={wallet}
        onPaymentSuccess={handlePaymentSuccess}
        initialIntendedTier={intendedTier}
      />

      {/* Global Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        profile={userProfile}
        onUpdateProfile={(updates) => {
          const updated = { ...userProfile, ...updates };
          setUserProfile(updated);
          saveStoredProfile(updated);
        }}
        wallet={wallet}
        onTopUpSuccess={handlePaymentSuccess}
        onExportData={() => {}}
        onClearHistory={handleClearAllThreads}
        initialTab={settingsInitialTab}
      />
    </div>
  );
}
