'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Sparkles,
  Lock,
  Cpu,
  Zap,
  AlertTriangle,
  Flame,
  Globe,
  Search,
  Table,
  X,
  Info,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { ModelInfo, ModelTier, WorkMode, ReasoningEffort, ResearchTier, RESEARCH_TIERS_META } from '@/lib/types';
import { AVAILABLE_MODELS } from '@/lib/constants';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (model: ModelInfo) => void;
  userCredits: number;
  userPlan: string;
  onOpenPaymentModal: (intendedTier?: ModelTier) => void;
  currentMode?: WorkMode;
  reasoningEffort?: ReasoningEffort;
  onChangeEffort?: (effort: ReasoningEffort) => void;
}

export default function ModelSelector({
  selectedModelId,
  onSelectModel,
  userCredits,
  userPlan,
  onOpenPaymentModal,
  currentMode = 'developer',
  reasoningEffort = 'Medium',
  onChangeEffort,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedModelTiers, setExpandedModelTiers] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const freeModels = AVAILABLE_MODELS.filter((m) => m.tier === 'free');
  const liteModels = AVAILABLE_MODELS.filter((m) => m.tier === 'lite');
  const plusModels = AVAILABLE_MODELS.filter((m) => m.tier === 'plus');
  const proModels = AVAILABLE_MODELS.filter((m) => m.tier === 'pro');
  const maxModels = AVAILABLE_MODELS.filter((m) => m.tier === 'max' || m.tier === 'vault');

  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [isEffortsMenuOpen, setIsEffortsMenuOpen] = useState(false);

  // Check if user has active Pro subscription or Max subscription
  const hasProSubscription = userPlan === 'Pro Builder' || userPlan === 'Pro' || userPlan === 'Max';
  const hasMaxSubscription = userPlan === 'Max';

  const handleModelClick = (model: ModelInfo, tierEffort?: ReasoningEffort) => {
    // Check access restrictions
    if (model.tier === 'max' || model.tier === 'vault') {
      // If user has Max subscription, native UI allocation
      if (hasMaxSubscription) {
        onSelectModel(model);
        if (tierEffort && onChangeEffort) onChangeEffort(tierEffort);
        setIsOpen(false);
        return;
      }
      // If user only has Pro subscription (or lower) and has enough credits in wallet, use pay-per-use
      if (userCredits >= model.costPerQueryCredits) {
        onSelectModel(model);
        if (tierEffort && onChangeEffort) onChangeEffort(tierEffort);
        setIsOpen(false);
        return;
      }
      // Otherwise prompt for top-up wallet / upgrade
      setIsOpen(false);
      onOpenPaymentModal('vault');
      return;
    }

    if (model.tier === 'pro') {
      if (!hasProSubscription && userCredits < model.costPerQueryCredits) {
        setIsOpen(false);
        onOpenPaymentModal('pro');
        return;
      }
    }

    if (model.tier === 'plus') {
      if (userPlan === 'Free Tier' && userCredits < model.costPerQueryCredits) {
        setIsOpen(false);
        onOpenPaymentModal('pro');
        return;
      }
    }

    if (
      model.tier === 'lite' &&
      userCredits < model.costPerQueryCredits &&
      userPlan === 'Free Tier'
    ) {
      setIsOpen(false);
      onOpenPaymentModal('lite');
      return;
    }

    onSelectModel(model);
    if (tierEffort && onChangeEffort) {
      onChangeEffort(tierEffort);
    }
    setIsOpen(false);
  };

  const getTierBadge = (tier: ModelTier) => {
    switch (tier) {
      case 'free':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#ECE8E1] text-[#55504A]">
            Free
          </span>
        );
      case 'lite':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
            Lite
          </span>
        );
      case 'plus':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            Plus
          </span>
        );
      case 'pro':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
            Pro
          </span>
        );
      case 'max':
      case 'vault':
      case 'pro_max':
        return (
          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            Max
          </span>
        );
    }
  };

  const effortLower = reasoningEffort.toLowerCase() as ResearchTier;
  const currentEffortMeta = RESEARCH_TIERS_META[effortLower] || RESEARCH_TIERS_META.medium;

  const researchTierList: { level: ReasoningEffort; key: ResearchTier }[] = [
    { level: 'Low', key: 'low' },
    { level: 'Medium', key: 'medium' },
    { level: 'High', key: 'high' },
    { level: 'Extra', key: 'extra' },
    { level: 'Max', key: 'max' },
  ];

  return (
    <div className="relative" ref={dropdownRef} id="model-selector-container">
      {/* Trigger Button */}
      <button
        id="model-selector-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#E5E2DC] bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#1F1E1D] text-xs md:text-sm font-medium transition-all shadow-xs cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          {currentMode === 'researcher' ? (
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Cpu className="w-3.5 h-3.5 text-[#736E67] shrink-0" />
          )}
          <span className="font-semibold text-[#1F1E1D] truncate max-w-[140px] sm:max-w-[200px]">
            {currentMode === 'researcher'
              ? `${currentModel.name} - ${reasoningEffort.toLowerCase()}`
              : currentModel.name}
          </span>
        </div>

        {currentMode === 'researcher' ? (
          <span
            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
              effortLower === 'max'
                ? 'bg-red-100 text-red-800'
                : effortLower === 'extra'
                ? 'bg-orange-100 text-orange-800'
                : effortLower === 'high'
                ? 'bg-amber-100 text-amber-800'
                : effortLower === 'medium'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {currentEffortMeta.badge}
          </span>
        ) : (
          getTierBadge(currentModel.tier)
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#858079] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="model-selector-dropdown"
          className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-[340px] sm:w-[430px] bg-[#FBF9F5] border border-[#E5E2DC] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#55504A]">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
              <span>
                {currentMode === 'researcher'
                  ? 'Researcher Models & Effort Tiers'
                  : 'Tiered Model Selector'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="view-specs-matrix-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpecsModal(true);
                }}
                className="text-[10px] font-semibold text-[#858079] hover:text-[#1F1E1D] bg-white hover:bg-[#FAF8F5] border border-[#D5D0C7] px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="View Tiered Model Map & Specifications table"
              >
                <Table className="w-3 h-3 text-[#B45309]" />
                <span>Specs Matrix</span>
              </button>
              <div className="text-[11px] text-[#736E67]">
                <span className="font-semibold text-[#1F1E1D]">{userCredits} Credits</span>
              </div>
            </div>
          </div>

          {/* Researcher Mode Tier Warning Banner */}
          {currentMode === 'researcher' && (
            <div className="px-3 py-2 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-[11px] leading-snug flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  Token Multiplier Notice:
                </p>
                <p className="text-[10px] text-amber-800">
                  Each model provides 5 research tiers (<strong>low, medium, high, extra, max</strong>). Higher tiers consume <strong>2x, 4x, 6x, or 10x</strong> more tokens than baseline. Extra tier allocates 10,240 max tokens for intensive deep search.
                </p>
              </div>
            </div>
          )}

          {/* Efforts Dropdown Menu for Researcher Mode */}
          {currentMode === 'researcher' && onChangeEffort && (
            <div className="px-3 py-2 bg-[#FAF7F2] border-b border-[#E5E2DC] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#55504A]">Efforts:</span>
                <div className="relative">
                  <button
                    id="model-selector-efforts-dropdown-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEffortsMenuOpen(!isEffortsMenuOpen);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-[#F3EFEA] border border-[#D5D0C7] text-xs font-semibold text-[#1F1E1D] shadow-2xs cursor-pointer transition-all"
                  >
                    <span>{reasoningEffort}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {currentEffortMeta.multiplier}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-[#736E67] transition-transform ${
                        isEffortsMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isEffortsMenuOpen && (
                    <div
                      id="model-selector-efforts-menu"
                      className="absolute left-0 top-full mt-1 w-56 bg-[#FBF9F5] border border-[#E5E2DC] rounded-lg shadow-lg z-30 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                    >
                      {researchTierList.map(({ level, key }) => {
                        const meta = RESEARCH_TIERS_META[key];
                        const isSel = reasoningEffort === level;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeEffort(level);
                              setIsEffortsMenuOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSel
                                ? 'bg-[#ECE8E1] text-[#1F1E1D] font-semibold'
                                : 'hover:bg-[#F3EFEA] text-[#4D4943]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{level}</span>
                              <span className="text-[10px] text-[#736E67] font-mono">
                                ({meta.multiplier})
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-emerald-700">
                              {meta.tokens.toLocaleString()} tok
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 hidden sm:inline">
                {currentEffortMeta.tokens.toLocaleString()} max tokens
              </span>
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto p-2 space-y-3">
            {/* 1. Free Tier Group */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Free Tier
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  {currentMode === 'researcher' ? 'Fast & Budget-friendly' : '0 Credits / Query'}
                </span>
              </div>
              <div className="space-y-1.5 mt-0.5">
                {freeModels.map((model) => {
                  const isCurrent = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-[#F4F1EA] border-[#D5D0C7]'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E5E2DC]'
                      }`}
                    >
                      <button
                        id={`model-option-${model.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                        type="button"
                        onClick={() => handleModelClick(model, reasoningEffort)}
                        className="w-full text-left px-2.5 py-2 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-[#1F1E1D]">
                                {currentMode === 'researcher'
                                  ? `${model.name} - ${reasoningEffort.toLowerCase()}`
                                  : model.name}
                              </span>
                              {model.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                                  {model.badge}
                                </span>
                              )}
                              {model.supportsThinking && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] font-medium flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> Thinking
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                                {model.contextWindow}
                              </span>
                            </div>

                            {/* Pricing Pill */}
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                In: <strong className="text-[#1F1E1D]">{model.inputPrice}</strong>
                              </span>
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                Out: <strong className="text-[#1F1E1D]">{model.outputPrice}</strong>
                              </span>
                              <span className="text-[9px] text-[#858079]">/ 1M tokens</span>
                            </div>

                            <p className="text-[11px] text-[#635E57] mt-1 leading-snug line-clamp-2">
                              {model.differentiators || model.description}
                            </p>
                          </div>

                          {isCurrent ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                              Free
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Lite Tier Group */}
            <div className="border-t border-[#E5E2DC] pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  Lite Tier
                </span>
                <span className="text-[10px] text-teal-700 font-medium">
                  {currentMode === 'researcher' ? 'High-Efficiency & Agentic' : '1 Credit / Query'}
                </span>
              </div>
              <div className="space-y-1.5 mt-0.5">
                {liteModels.map((model) => {
                  const isCurrent = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-teal-50/70 border-teal-200'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E5E2DC]'
                      }`}
                    >
                      <button
                        id={`model-option-${model.id}`}
                        type="button"
                        onClick={() => handleModelClick(model, reasoningEffort)}
                        className="w-full text-left px-2.5 py-2 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-[#1F1E1D]">
                                {currentMode === 'researcher'
                                  ? `${model.name} - ${reasoningEffort.toLowerCase()}`
                                  : model.name}
                              </span>
                              {model.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                                  {model.badge}
                                </span>
                              )}
                              {model.supportsThinking && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] font-medium flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> Thinking
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                                {model.contextWindow}
                              </span>
                            </div>

                            {/* Pricing Pill */}
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                In: <strong className="text-[#1F1E1D]">{model.inputPrice}</strong>
                              </span>
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                Out: <strong className="text-[#1F1E1D]">{model.outputPrice}</strong>
                              </span>
                              <span className="text-[9px] text-[#858079]">/ 1M tokens</span>
                            </div>

                            <p className="text-[11px] text-[#635E57] mt-1 leading-snug line-clamp-2">
                              {model.differentiators || model.description}
                            </p>
                          </div>

                          {isCurrent ? (
                            <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          ) : (
                            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded shrink-0">
                              Lite
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Plus Tier Group */}
            <div className="border-t border-[#E5E2DC] pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Plus Tier
                </span>
                <span className="text-[10px] text-[#0A66C2] font-medium">
                  {userPlan === 'Free Tier' ? 'Upgrade to Plus' : 'Included in Plus'}
                </span>
              </div>
              <div className="space-y-1.5 mt-0.5">
                {plusModels.map((model) => {
                  const isCurrent = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-[#EAF3FF] border-[#BFDBFE]'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E5E2DC]'
                      }`}
                    >
                      <button
                        id={`model-option-${model.id}`}
                        type="button"
                        onClick={() => handleModelClick(model, reasoningEffort)}
                        className="w-full text-left px-2.5 py-2 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-[#1F1E1D]">
                                {currentMode === 'researcher'
                                  ? `${model.name} - ${reasoningEffort.toLowerCase()}`
                                  : model.name}
                              </span>
                              {model.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                  {model.badge}
                                </span>
                              )}
                              {model.supportsThinking && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] font-medium flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> Thinking
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                                {model.contextWindow}
                              </span>
                            </div>

                            {/* Pricing Pill */}
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                In: <strong className="text-[#1F1E1D]">{model.inputPrice}</strong>
                              </span>
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                Out: <strong className="text-[#1F1E1D]">{model.outputPrice}</strong>
                              </span>
                              <span className="text-[9px] text-[#858079]">/ 1M tokens</span>
                            </div>

                            <p className="text-[11px] text-[#635E57] mt-1 leading-snug line-clamp-2">
                              {model.differentiators || model.description}
                            </p>
                          </div>

                          {isCurrent ? (
                            <Check className="w-4 h-4 text-[#0A66C2] shrink-0 mt-0.5" />
                          ) : (
                            <span className="text-[10px] font-semibold text-[#0A66C2] bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                              Plus
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Pro Tier Group */}
            <div className="border-t border-[#E5E2DC] pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Pro Tier (Elite Native Access)
                </span>
                <span className="text-[10px] text-purple-700 font-medium">Heavy Workspace</span>
              </div>
              <div className="space-y-1.5 mt-0.5">
                {proModels.map((model) => {
                  const hasAccess = hasProSubscription || userCredits >= model.costPerQueryCredits;
                  const isCurrent = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-[#FAF5FF] border-[#D8B4FE]'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E5E2DC]'
                      }`}
                    >
                      <button
                        id={`model-option-${model.id}`}
                        type="button"
                        onClick={() => handleModelClick(model, reasoningEffort)}
                        className="w-full text-left px-2.5 py-2 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-[#1F1E1D]">
                                {currentMode === 'researcher'
                                  ? `${model.name} - ${reasoningEffort.toLowerCase()}`
                                  : model.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-900 border border-purple-200 font-medium">
                                {model.badge}
                              </span>
                              {model.supportsThinking && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] font-medium flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> Thinking
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                                {model.contextWindow}
                              </span>
                            </div>

                            {/* Pricing Pill */}
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                In: <strong className="text-[#1F1E1D]">{model.inputPrice}</strong>
                              </span>
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                Out: <strong className="text-[#1F1E1D]">{model.outputPrice}</strong>
                              </span>
                              <span className="text-[9px] text-[#858079]">/ 1M tokens</span>
                            </div>

                            <p className="text-[11px] text-[#635E57] mt-1 leading-snug line-clamp-2">
                              {model.differentiators || model.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Pro
                            </span>
                            {!hasAccess && (
                              <Lock className="w-3.5 h-3.5 text-purple-700" />
                            )}
                            {isCurrent && (
                              <Check className="w-4 h-4 text-purple-700" />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Max Tier Group (Dual-Gate Mechanism) */}
            <div className="border-t border-[#E5E2DC] pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Max Tier (Frontier Vault)
                </span>
                {hasMaxSubscription ? (
                  <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Native UI Allocation
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Pay-Per-Use Token Wallet
                  </span>
                )}
              </div>

              {/* Dual-Gate explanatory banner when on Pro or lower */}
              {!hasMaxSubscription && (
                <div className="mx-2 my-1 px-2.5 py-1.5 rounded-md bg-amber-50/80 border border-amber-200/80 text-[10px] text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Wallet className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      {hasProSubscription
                        ? 'Pro Plan: Unlocked via Pay-Per-Use Wallet (pulls directly from balance)'
                        : 'Requires Max Plan or Pay-Per-Use Token Wallet balance'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenPaymentModal('vault');
                    }}
                    className="font-semibold underline text-amber-800 hover:text-amber-950 shrink-0 ml-1 cursor-pointer"
                  >
                    Top up $10
                  </button>
                </div>
              )}

              <div className="space-y-1.5 mt-0.5">
                {maxModels.map((model) => {
                  const hasEnough = hasMaxSubscription || userCredits >= model.costPerQueryCredits;
                  const isCurrent = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-[#FFF7ED] border-[#FDBA74]'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E5E2DC]'
                      }`}
                    >
                      <button
                        id={`model-option-${model.id}`}
                        type="button"
                        onClick={() => handleModelClick(model, reasoningEffort)}
                        className="w-full text-left px-2.5 py-2 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-[#1F1E1D]">
                                {currentMode === 'researcher'
                                  ? `${model.name} - ${reasoningEffort.toLowerCase()}`
                                  : model.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                                {model.badge}
                              </span>
                              {model.supportsThinking && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] font-medium flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" /> Thinking
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                                {model.contextWindow}
                              </span>
                            </div>

                            {/* Pricing Pill */}
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                In: <strong className="text-[#1F1E1D]">{model.inputPrice}</strong>
                              </span>
                              <span className="text-[#55504A] bg-[#F3EFEA] px-1.5 py-0.5 rounded font-mono">
                                Out: <strong className="text-[#1F1E1D]">{model.outputPrice}</strong>
                              </span>
                              <span className="text-[9px] text-[#858079]">/ 1M tokens</span>
                            </div>

                            <p className="text-[11px] text-[#635E57] mt-1 leading-snug line-clamp-2">
                              {model.differentiators || model.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            {hasMaxSubscription ? (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-amber-700" /> Max
                              </span>
                            ) : (
                              <span
                                title="Pay-Per-Use Token Wallet: pulls directly from your top-up balance at API cost per message"
                                className="text-[10px] font-semibold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1"
                              >
                                <Wallet className="w-3 h-3 text-amber-700" /> Pay-Per-Use
                              </span>
                            )}
                            {!hasEnough && (
                              <Lock className="w-3.5 h-3.5 text-[#B45309]" />
                            )}
                            {isCurrent && (
                              <Check className="w-4 h-4 text-[#B45309]" />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Top-up link in footer */}
          <div className="p-2.5 bg-[#F3EFEA] border-t border-[#E5E2DC] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowSpecsModal(true)}
              className="text-[11px] text-[#55504A] hover:text-[#1F1E1D] flex items-center gap-1 font-medium cursor-pointer"
            >
              <Info className="w-3 h-3 text-[#858079]" />
              View Full Price & Specs Map
            </button>
            <button
              id="dropdown-topup-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPaymentModal('vault');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
            >
              Top Up via eSewa / Khalti &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Full Modal: Corrected Tiered Model Map & Specifications */}
      {showSpecsModal && (
        <div
          className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSpecsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-[#E5E2DC] max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#FBF9F5] border-b border-[#E5E2DC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#B45309]" />
                  Corrected Tiered Model Map & Specifications
                </h3>
                <p className="text-xs text-[#736E67] mt-0.5">
                  Official runtime pricing, throughput differentiators, and architected capability tiers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecsModal(false)}
                className="p-1.5 rounded-lg text-[#858079] hover:text-[#1F1E1D] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-auto p-5">
              <div className="border border-[#E5E2DC] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F6F4EE] border-b border-[#E5E2DC] text-[#55504A]">
                      <th className="py-2.5 px-3 font-semibold w-24">Tier</th>
                      <th className="py-2.5 px-3 font-semibold w-40">Model</th>
                      <th className="py-2.5 px-3 font-semibold w-32">Input Price (per 1M)</th>
                      <th className="py-2.5 px-3 font-semibold w-32">Output Price (per 1M)</th>
                      <th className="py-2.5 px-3 font-semibold">Core Capabilities & Differentiators</th>
                      <th className="py-2.5 px-3 font-semibold w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2DC]">
                    {AVAILABLE_MODELS.map((model) => {
                      const isCurrent = selectedModelId === model.id;
                      const tierLabel =
                        model.tier === 'free'
                          ? 'Free'
                          : model.tier === 'lite'
                          ? 'Lite'
                          : model.tier === 'plus'
                          ? 'Plus'
                          : model.tier === 'pro'
                          ? 'Pro'
                          : 'Max';
                      const tierBg =
                        model.tier === 'free'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : model.tier === 'lite'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : model.tier === 'plus'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : model.tier === 'pro'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200';

                      return (
                        <tr
                          key={model.id}
                          className={`hover:bg-[#FAF8F5] transition-colors ${
                            isCurrent ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-3 align-top">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${tierBg}`}>
                              {tierLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="font-semibold text-[#1F1E1D]">{model.name}</div>
                            <div className="text-[10px] text-[#858079] mt-0.5">{model.provider}</div>
                            {model.supportsThinking && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 font-medium mt-0.5">
                                <Zap className="w-2.5 h-2.5" /> Thinking
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top font-mono text-[11px] text-[#1F1E1D]">
                            {model.inputPrice}
                          </td>
                          <td className="py-3 px-3 align-top font-mono text-[11px] text-[#1F1E1D]">
                            {model.outputPrice}
                          </td>
                          <td className="py-3 px-3 align-top text-[#55504A] leading-relaxed">
                            {model.differentiators}
                          </td>
                          <td className="py-3 px-3 align-top text-center">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <Check className="w-3.5 h-3.5" /> Selected
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleModelClick(model, reasoningEffort);
                                  setShowSpecsModal(false);
                                }}
                                className="px-2 py-1 text-[11px] font-medium rounded bg-[#1F1E1D] text-white hover:bg-black transition-colors cursor-pointer"
                              >
                                Select
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#FBF9F5] border-t border-[#E5E2DC] flex items-center justify-between text-xs text-[#736E67]">
              <span>Off-Peak discounts apply automatically during eligible processing windows.</span>
              <button
                type="button"
                onClick={() => setShowSpecsModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#D5D0C7] hover:bg-[#F3EFEA] font-medium text-[#1F1E1D] transition-colors cursor-pointer"
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
