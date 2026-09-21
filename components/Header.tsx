'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Code2,
  BookOpen,
  MessageSquare,
  Sliders,
  PanelRight,
  PanelLeft,
  PlusCircle,
  Coins,
  CreditCard,
  Layers,
  Sparkles,
  Mountain,
  Settings,
  Home,
  Link2,
  Terminal,
  LogIn,
  LogOut,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { WorkMode, ModelInfo, ReasoningEffort, UserWallet, ModelTier, UserProfileSettings } from '@/lib/types';
import ModelSelector from './ModelSelector';
import EffortSlider from './EffortSlider';

interface HeaderProps {
  currentMode: WorkMode;
  onChangeMode: (mode: WorkMode) => void;
  selectedModel: ModelInfo;
  onSelectModel: (model: ModelInfo) => void;
  reasoningEffort: ReasoningEffort;
  onChangeEffort: (effort: ReasoningEffort) => void;
  wallet: UserWallet;
  onOpenPaymentModal: (intendedTier?: ModelTier) => void;
  isParameterDrawerOpen: boolean;
  onToggleParameterDrawer: () => void;
  isCanvasOpen: boolean;
  onToggleCanvas: () => void;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
  terminalErrorCount?: number;
  activeMobileTab: 'chat' | 'canvas';
  onChangeMobileTab: (tab: 'chat' | 'canvas') => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenConnectors?: () => void;
  profile?: UserProfileSettings;
  user?: User | null;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
}

export default function Header({
  currentMode,
  onChangeMode,
  selectedModel,
  onSelectModel,
  reasoningEffort,
  onChangeEffort,
  wallet,
  onOpenPaymentModal,
  isParameterDrawerOpen,
  onToggleParameterDrawer,
  isCanvasOpen,
  onToggleCanvas,
  isTerminalOpen,
  onToggleTerminal,
  terminalErrorCount,
  activeMobileTab,
  onChangeMobileTab,
  isSidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  onOpenConnectors,
  profile,
  user,
  onOpenSignIn,
  onSignOut,
}: HeaderProps) {
  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 bg-[#FBF9F5] border-b border-[#E5E2DC] px-3 sm:px-4 py-2.5 transition-all"
    >
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-2 md:gap-4">
        {/* Left: Sidebar Toggle, Branding & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleSidebar && (
            <button
              id="header-sidebar-toggle-btn"
              type="button"
              onClick={onToggleSidebar}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSidebarOpen
                  ? 'bg-[#EFECE6] text-[#1F1E1D] border-[#D5D0C7]'
                  : 'bg-white hover:bg-[#FAF8F5] text-[#736E67] hover:text-[#1F1E1D] border-[#E5E2DC]'
              }`}
              title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label="Toggle Navigation Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Brand Logo & Name linking to Homepage */}
          <Link
            href="/"
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
            title="Return to AlphanexAI Homepage"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1F1E1D] text-[#FBF9F5] flex items-center justify-center font-bold text-base shadow-xs relative group-hover:scale-105 transition-transform">
              <span className="font-mono text-amber-400 font-black tracking-tighter text-sm">AN</span>
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold"
                title="Alphanex Regional Hub"
              >
                AI
              </div>
            </div>
            <div className="hidden lg:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-[#1F1E1D]">
                  AlphanexAI
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-[#EFECE6] text-[#736E67] border border-[#E5E2DC]">
                  Workspace
                </span>
              </div>
              <p className="text-[10px] text-[#858079] leading-none flex items-center gap-1">
                <span>Frontier Studio</span>
                <span className="text-[#B8B2A6]">&middot;</span>
                <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
                  <Home className="w-2.5 h-2.5" /> Home
                </span>
              </p>
            </div>
          </Link>

          {/* Mode Switcher Segmented Control */}
          <div
            id="mode-switcher-control"
            className="flex items-center bg-[#F3EFEA] p-0.5 rounded-lg border border-[#E5E2DC]"
            role="tablist"
            aria-label="Workflow Mode Switcher"
          >
            <button
              id="mode-btn-developer"
              type="button"
              role="tab"
              aria-selected={currentMode === 'developer'}
              onClick={() => onChangeMode('developer')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                currentMode === 'developer'
                  ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs border border-[#E5E2DC]'
                  : 'text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#ECE8E1]'
              }`}
              title="Developer Mode: Code debugging, side-by-side diffs, Pyodide WASM terminal, and GitHub export"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Developer</span>
            </button>

            <button
              id="mode-btn-researcher"
              type="button"
              role="tab"
              aria-selected={currentMode === 'researcher'}
              onClick={() => onChangeMode('researcher')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                currentMode === 'researcher'
                  ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs border border-[#E5E2DC]'
                  : 'text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#ECE8E1]'
              }`}
              title="Researcher Mode: Live SERP search grounding, verified Nepal & global source citations"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Researcher</span>
            </button>

            <button
              id="mode-btn-general"
              type="button"
              role="tab"
              aria-selected={currentMode === 'general'}
              onClick={() => onChangeMode('general')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                currentMode === 'general'
                  ? 'bg-[#FBF9F5] text-[#1F1E1D] font-semibold shadow-xs border border-[#E5E2DC]'
                  : 'text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#ECE8E1]'
              }`}
              title="General Mode: Conversational, synthesis, drafting, and flexible reasoning"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">General</span>
            </button>
          </div>
        </div>

        {/* Center: Multi-Tier Model Selector */}
        <div className="flex-1 flex justify-center max-w-sm">
          <ModelSelector
            selectedModelId={selectedModel.id}
            onSelectModel={onSelectModel}
            userCredits={wallet.credits}
            userPlan={wallet.plan}
            onOpenPaymentModal={onOpenPaymentModal}
            currentMode={currentMode}
            reasoningEffort={reasoningEffort}
            onChangeEffort={onChangeEffort}
          />
        </div>

        {/* Right: Reasoning Effort, Wallet, Parameter Drawer, Canvas Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Reasoning Effort Pill (Hybrid Thinking style) */}
          <EffortSlider
            effort={reasoningEffort}
            onChangeEffort={onChangeEffort}
            supportsThinking={selectedModel.supportsThinking}
            modelName={selectedModel.name}
            currentMode={currentMode}
          />

          {/* User Wallet Widget (eSewa / Khalti top-up button) */}
          <div
            id="wallet-widget"
            className="flex items-center gap-1.5 bg-[#F3EFEA] border border-[#E5E2DC] rounded-lg px-2.5 py-1"
          >
            <div className="flex items-center gap-1 text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold text-[#1F1E1D]">{wallet.credits}</span>
              <span className="hidden md:inline text-[11px] text-[#736E67]">
                Credits | {wallet.plan}
              </span>
            </div>

            <button
              id="header-topup-button"
              type="button"
              onClick={() => onOpenPaymentModal()}
              className="ml-1 text-[11px] font-semibold text-[#1F1E1D] bg-[#FBF9F5] hover:bg-[#ECE8E1] border border-[#D5D0C7] rounded px-2 py-0.5 transition-colors flex items-center gap-1 shadow-2xs"
              title="Top up credits via eSewa or Khalti instantly"
            >
              <PlusCircle className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Top Up</span>
            </button>
          </div>

          {/* Google AI Studio Parameter Drawer Toggle */}
          <button
            id="toggle-params-drawer"
            type="button"
            onClick={onToggleParameterDrawer}
            className={`p-1.5 rounded-lg border transition-all ${
              isParameterDrawerOpen
                ? 'bg-[#1F1E1D] text-[#FBF9F5] border-[#1F1E1D]'
                : 'bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#55504A] border-[#E5E2DC]'
            }`}
            title="Toggle Google AI Studio Parameters Inspector (System Instructions, Temperature, Tokens)"
            aria-label="Parameters Inspector"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* MCP Connectors Trigger Button (Claude.ai customize/connectors style) */}
          {onOpenConnectors && (
            <button
              id="header-mcp-connectors-btn"
              type="button"
              onClick={onOpenConnectors}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-[#E5E2DC] bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#1F1E1D] text-xs font-medium transition-all shadow-xs cursor-pointer"
              title="Customise Connectors: GitHub, Google Docs, Gmail & custom MCP tools"
              aria-label="Customise MCP Connectors"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline font-semibold">Connectors</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          )}

          {/* Canvas & Artifacts Panel Toggle (Claude-style) */}
          <button
            id="toggle-canvas-panel"
            type="button"
            onClick={onToggleCanvas}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isCanvasOpen
                ? 'bg-[#EFECE6] text-[#1F1E1D] border-[#D5D0C7] shadow-xs'
                : 'bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#1F1E1D] border-blue-500/50 shadow-xs ring-1 ring-blue-500/20'
            }`}
            title={
              isCanvasOpen
                ? 'Close Canvas Panel (Chat gets full width)'
                : currentMode === 'developer'
                ? 'Open Canvas Panel (Diff Viewer, Python Terminal, GitHub PR)'
                : currentMode === 'researcher'
                ? 'Open Canvas Panel (Source Inspector & Research Brief)'
                : 'Open Canvas Panel (Document Canvas & Scratchpad)'
            }
            aria-label="Toggle Canvas Panel"
          >
            <PanelRight className={`w-4 h-4 ${isCanvasOpen ? 'text-[#736E67]' : 'text-blue-600'}`} />
            <span className="hidden sm:inline font-semibold">
              {isCanvasOpen ? 'Canvas' : 'Open Canvas'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCanvasOpen ? 'bg-emerald-500' : 'bg-blue-600 animate-pulse'
              }`}
            />
          </button>

          {/* Terminal Output Panel Toggle */}
          {onToggleTerminal && (
            <button
              id="header-toggle-terminal-btn"
              type="button"
              onClick={onToggleTerminal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isTerminalOpen
                  ? 'bg-[#1F1E1D] text-white border-[#1F1E1D] shadow-xs'
                  : terminalErrorCount && terminalErrorCount > 0
                  ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100 shadow-xs'
                  : 'bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#55504A] hover:text-[#1F1E1D] border-[#E5E2DC]'
              }`}
              title={
                isTerminalOpen
                  ? 'Hide Web App Terminal Output'
                  : terminalErrorCount && terminalErrorCount > 0
                  ? `${terminalErrorCount} runtime errors in terminal. Click to open.`
                  : 'Open Web App Terminal Output & Logs'
              }
              aria-label="Toggle Terminal Panel"
            >
              <Terminal
                className={`w-4 h-4 ${
                  isTerminalOpen
                    ? 'text-emerald-400'
                    : terminalErrorCount && terminalErrorCount > 0
                    ? 'text-red-600'
                    : 'text-[#736E67]'
                }`}
              />
              <span className="hidden sm:inline font-semibold">Terminal</span>
              {terminalErrorCount && terminalErrorCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white leading-none">
                  {terminalErrorCount}
                </span>
              ) : (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isTerminalOpen ? 'bg-emerald-400' : 'bg-emerald-500/70'
                  }`}
                />
              )}
            </button>
          )}

          {/* Settings Trigger Button (Claude-style Cmd+,) */}
          {onOpenSettings && (
            <button
              id="header-settings-btn"
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg border border-[#E5E2DC] bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#55504A] hover:text-[#1F1E1D] transition-colors cursor-pointer flex items-center gap-1.5"
              title="Settings & Profile (Cmd+,)"
              aria-label="Settings & Profile"
            >
              {profile?.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full object-cover border border-[#D5D0C7]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Settings className="w-4 h-4" />
              )}
              <span className="hidden xl:inline text-xs font-medium">
                {user ? (profile?.fullName?.split(' ')[0] || 'Profile') : 'Settings'}
              </span>
            </button>
          )}

          {/* Authentication Action Button */}
          {user ? (
            onSignOut && (
              <button
                id="header-sign-out-btn"
                type="button"
                onClick={onSignOut}
                className="p-1.5 rounded-lg border border-[#E5E2DC] bg-[#FBF9F5] hover:bg-red-50 text-[#736E67] hover:text-red-700 transition-colors cursor-pointer hidden sm:flex items-center gap-1"
                title="Sign out of account"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden 2xl:inline text-xs font-medium">Sign Out</span>
              </button>
            )
          ) : (
            onOpenSignIn && (
              <button
                id="header-sign-in-btn"
                type="button"
                onClick={onOpenSignIn}
                className="px-3 py-1.5 rounded-lg border border-[#1F1E1D] bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Sign in with Google or GitHub"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )
          )}

          {/* Mobile Tab Switcher (Chat vs Canvas) */}
          <div className="md:hidden flex items-center bg-[#F3EFEA] p-0.5 rounded-lg border border-[#E5E2DC]">
            <button
              id="mobile-tab-chat"
              type="button"
              onClick={() => onChangeMobileTab('chat')}
              className={`px-2 py-1 text-xs rounded font-medium ${
                activeMobileTab === 'chat'
                  ? 'bg-white text-[#1F1E1D] shadow-xs'
                  : 'text-[#736E67]'
              }`}
            >
              Chat
            </button>
            <button
              id="mobile-tab-canvas"
              type="button"
              onClick={() => onChangeMobileTab('canvas')}
              className={`px-2 py-1 text-xs rounded font-medium ${
                activeMobileTab === 'canvas'
                  ? 'bg-white text-[#1F1E1D] shadow-xs'
                  : 'text-[#736E67]'
              }`}
            >
              Canvas
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
