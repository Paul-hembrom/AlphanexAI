'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Check,
  Brain,
  Sliders,
  Zap,
  ShieldCheck,
  Info,
} from 'lucide-react';

export type ThinkingEffortLevel = 'low' | 'medium' | 'high';

export interface ModelOption {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  supportsThinking?: boolean;
}

const DEFAULT_MODELS: ModelOption[] = [
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    tagline: 'Hybrid reasoning & coding flagship',
    badge: 'Most Intelligent',
    supportsThinking: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    tagline: 'High-speed reasoning & vision',
    badge: 'Fast',
    supportsThinking: true,
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    tagline: 'Lightweight & instant response',
    badge: 'Fastest',
    supportsThinking: false,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    tagline: 'Deep writing & nuanced domain analysis',
    supportsThinking: false,
  },
];

interface ClaudeModelSelectorProps {
  models?: ModelOption[];
  initialModelId?: string;
  initialThinkingEnabled?: boolean;
  initialThinkingEffort?: ThinkingEffortLevel;
  onModelChange?: (model: ModelOption) => void;
  onThinkingChange?: (enabled: boolean, effort: ThinkingEffortLevel) => void;
}

export default function ClaudeModelSelector({
  models = DEFAULT_MODELS,
  initialModelId = 'claude-3-7-sonnet',
  initialThinkingEnabled = true,
  initialThinkingEffort = 'medium',
  onModelChange,
  onThinkingChange,
}: ClaudeModelSelectorProps) {
  // Core Selection States
  const [activeModelId, setActiveModelId] = useState<string>(initialModelId);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(initialThinkingEnabled);
  const [thinkingEffortLevel, setThinkingEffortLevel] = useState<ThinkingEffortLevel>(initialThinkingEffort);

  // Menu Visibility States
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);

  // Refs for click outside and hover intent timer
  const containerRef = useRef<HTMLDivElement>(null);
  const flyoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeModel = models.find((m) => m.id === activeModelId) || models[0];

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsMainMenuOpen(false);
        setIsFlyoutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe Zone Hover Intent handlers
  const handleFlyoutRowEnter = useCallback(() => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
    setIsFlyoutOpen(true);
  }, []);

  const handleFlyoutRowLeave = useCallback(() => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    // 140ms grace buffer allows the cursor to move diagonally into the sub-menu without abrupt closure
    flyoutTimerRef.current = setTimeout(() => {
      setIsFlyoutOpen(false);
    }, 140);
  }, []);

  const handleFlyoutMenuEnter = useCallback(() => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
    setIsFlyoutOpen(true);
  }, []);

  const handleFlyoutMenuLeave = useCallback(() => {
    if (flyoutTimerRef.current) clearTimeout(flyoutTimerRef.current);
    flyoutTimerRef.current = setTimeout(() => {
      setIsFlyoutOpen(false);
    }, 120);
  }, []);

  // Model Selection
  const handleSelectModel = (model: ModelOption) => {
    setActiveModelId(model.id);
    onModelChange?.(model);
    setIsMainMenuOpen(false);
    setIsFlyoutOpen(false);
  };

  // Thinking State Updates
  const handleToggleThinking = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isThinkingEnabled;
    setIsThinkingEnabled(next);
    onThinkingChange?.(next, thinkingEffortLevel);
  };

  const handleSelectEffort = (level: ThinkingEffortLevel, e: React.MouseEvent) => {
    e.stopPropagation();
    setThinkingEffortLevel(level);
    onThinkingChange?.(isThinkingEnabled, level);
  };

  return (
    <div
      ref={containerRef}
      id="claude-model-selector-root"
      className="relative inline-block text-left select-none font-sans"
    >
      {/* 1. Trigger Button (Sits in/near the chat input dock) */}
      <button
        id="claude-model-trigger-btn"
        type="button"
        onClick={() => {
          setIsMainMenuOpen((prev) => !prev);
          setIsFlyoutOpen(false);
        }}
        aria-haspopup="true"
        aria-expanded={isMainMenuOpen}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.98] ${
          isMainMenuOpen
            ? 'bg-[#EAE6DF] border-[#C8C2B7] text-[#1F1E1D] shadow-xs'
            : 'bg-[#FBF9F5] hover:bg-[#F2EFE9] border-[#E2DDD5] text-[#3D3A37] hover:border-[#D0C9BE]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold truncate text-[#1F1E1D]">{activeModel.name}</span>

          {/* Micro pill indicator if thinking is enabled for current model */}
          {activeModel.supportsThinking && isThinkingEnabled && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-[#E8F0FE] text-blue-800 text-[10px] font-mono font-medium border border-blue-200"
              title={`Extended thinking enabled (${thinkingEffortLevel} effort)`}
            >
              <Brain className="w-2.5 h-2.5 text-blue-600" />
              <span className="capitalize">{thinkingEffortLevel}</span>
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8C877F] transition-transform duration-200 ${
            isMainMenuOpen ? 'rotate-180 text-[#1F1E1D]' : 'group-hover:text-[#4D4943]'
          }`}
        />
      </button>

      {/* 2. Main Dropdown Menu (Opens upwards above the chat input dock) */}
      {isMainMenuOpen && (
        <div
          id="claude-model-main-menu"
          role="menu"
          className="absolute bottom-full mb-2.5 left-0 w-72 rounded-2xl bg-[#FCFAF7] border border-[#DDD8CE] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 outline-hidden"
        >
          {/* Menu Header / Category Label */}
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#8C877F] uppercase tracking-wider flex items-center justify-between border-b border-[#EFECE6] mb-1">
            <span>Choose Model</span>
            <span className="text-[10px] font-mono lowercase text-[#A8A298]">v3.7</span>
          </div>

          {/* Model Item List */}
          <div className="space-y-0.5">
            {models.map((model) => {
              const isSelected = model.id === activeModelId;
              return (
                <button
                  key={model.id}
                  id={`model-option-${model.id}`}
                  type="button"
                  onClick={() => handleSelectModel(model)}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-[#EFECE6] text-[#1F1E1D]'
                      : 'hover:bg-[#F4F1EB] text-[#3D3A37]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#1F1E1D]">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#E5E0D6] text-[#55504A]">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#736E67] leading-tight mt-0.5 truncate">
                      {model.tagline}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="shrink-0 mt-0.5 text-blue-600">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#EFECE6] my-1.5" />

          {/* 3. Flyout Row: Reasoning Settings with Safe-Zone Bridge */}
          <div
            id="claude-reasoning-row-container"
            className="relative"
            onMouseEnter={handleFlyoutRowEnter}
            onMouseLeave={handleFlyoutRowLeave}
          >
            <div
              id="claude-reasoning-settings-row"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                isFlyoutOpen
                  ? 'bg-[#EAE5DC] text-[#1F1E1D]'
                  : 'hover:bg-[#F4F1EB] text-[#3D3A37]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    isThinkingEnabled ? 'bg-blue-100 text-blue-700' : 'bg-[#EAE5DC] text-[#736E67]'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#1F1E1D] flex items-center gap-1.5">
                    <span>Reasoning Settings</span>
                    {isThinkingEnabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#736E67]">
                    {isThinkingEnabled
                      ? `Extended thinking (${thinkingEffortLevel})`
                      : 'Standard response mode'}
                  </span>
                </div>
              </div>

              <ChevronRight
                className={`w-4 h-4 text-[#8C877F] transition-transform ${
                  isFlyoutOpen ? 'translate-x-0.5 text-[#1F1E1D]' : ''
                }`}
              />
            </div>

            {/* 4 & 5. Flyout Sub-menu (Positioned directly to the right with invisible hover bridge) */}
            {isFlyoutOpen && (
              <div
                id="claude-thinking-flyout-menu"
                onMouseEnter={handleFlyoutMenuEnter}
                onMouseLeave={handleFlyoutMenuLeave}
                className="absolute left-full bottom-0 ml-1.5 w-72 rounded-2xl bg-[#FCFAF7] border border-[#DDD8CE] shadow-2xl p-3.5 z-60 animate-in fade-in slide-in-from-left-1 duration-150"
              >
                {/* 
                  INVISIBLE HIT-TEST BRIDGE (Zero-Dead-Space Guard):
                  Extends 12px to the left over the margin gap so continuous mouse travel 
                  never triggers mouseleave.
                */}
                <div className="absolute -left-3 top-0 bottom-0 w-3 bg-transparent pointer-events-auto" />

                {/* Flyout Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#EFECE6]">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-[#1F1E1D]">Extended Thinking</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono font-medium">
                    Claude 3.7
                  </span>
                </div>

                {/* Extended Thinking Toggle Row */}
                <div className="flex items-center justify-between py-1 mb-3">
                  <div className="pr-2">
                    <label
                      htmlFor="extended-thinking-toggle"
                      className="text-xs font-semibold text-[#1F1E1D] block cursor-pointer"
                    >
                      Thinking Mode
                    </label>
                    <p className="text-[11px] text-[#736E67] leading-tight mt-0.5">
                      Allow model to reason deeply before responding
                    </p>
                  </div>

                  {/* iOS/Claude Style Switch */}
                  <button
                    id="extended-thinking-toggle"
                    type="button"
                    role="switch"
                    aria-checked={isThinkingEnabled}
                    onClick={handleToggleThinking}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isThinkingEnabled ? 'bg-blue-600' : 'bg-[#D6D0C4]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isThinkingEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Thinking Effort Segment Control */}
                <div
                  className={`transition-opacity duration-200 ${
                    isThinkingEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#55504A] mb-1.5">
                    <span>Thinking Effort</span>
                    <span className="font-mono text-[#736E67] text-[10px]">
                      {thinkingEffortLevel === 'low' && '~4,000 tokens'}
                      {thinkingEffortLevel === 'medium' && '~16,000 tokens'}
                      {thinkingEffortLevel === 'high' && '~32,000 tokens'}
                    </span>
                  </div>

                  {/* Segmented Pill Control */}
                  <div
                    role="radiogroup"
                    aria-label="Thinking Effort"
                    className="grid grid-cols-3 gap-1 bg-[#EFECE6] p-1 rounded-xl border border-[#DDD8CE]"
                  >
                    {(['low', 'medium', 'high'] as ThinkingEffortLevel[]).map((level) => {
                      const isLevelActive = thinkingEffortLevel === level;
                      return (
                        <button
                          key={level}
                          id={`effort-btn-${level}`}
                          type="button"
                          role="radio"
                          aria-checked={isLevelActive}
                          onClick={(e) => handleSelectEffort(level, e)}
                          className={`py-1 text-[11px] font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                            isLevelActive
                              ? 'bg-white text-[#1F1E1D] shadow-xs'
                              : 'text-[#736E67] hover:text-[#1F1E1D]'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>

                  {/* Contextual description note */}
                  <div className="mt-3 p-2 rounded-lg bg-[#FAF8F4] border border-[#E5E2DC] text-[10px] text-[#736E67] flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#8C877F] shrink-0 mt-0.2" />
                    <span>
                      Higher effort enables comprehensive math, code, and system architecture verification.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
