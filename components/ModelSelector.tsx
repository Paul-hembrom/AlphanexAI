'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Lock, Cpu, Zap, ShieldAlert } from 'lucide-react';
import { ModelInfo, ModelTier } from '@/lib/types';
import { AVAILABLE_MODELS } from '@/lib/constants';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (model: ModelInfo) => void;
  userCredits: number;
  userPlan: string;
  onOpenPaymentModal: (intendedTier?: ModelTier) => void;
}

export default function ModelSelector({
  selectedModelId,
  onSelectModel,
  userCredits,
  userPlan,
  onOpenPaymentModal,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
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
  const proModels = AVAILABLE_MODELS.filter((m) => m.tier === 'pro');
  const vaultModels = AVAILABLE_MODELS.filter((m) => m.tier === 'vault');

  const handleModelClick = (model: ModelInfo) => {
    // Check access restrictions
    if (model.tier === 'vault' && userCredits < model.costPerQueryCredits) {
      setIsOpen(false);
      onOpenPaymentModal('vault');
      return;
    }
    if (model.tier === 'pro' && userPlan === 'Free Tier') {
      setIsOpen(false);
      onOpenPaymentModal('pro');
      return;
    }

    onSelectModel(model);
    setIsOpen(false);
  };

  const getTierBadge = (tier: ModelTier) => {
    switch (tier) {
      case 'free':
        return (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#ECE8E1] text-[#55504A]">
            Free
          </span>
        );
      case 'pro':
        return (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E8F3FF] text-[#0A66C2]">
            Pro Plan
          </span>
        );
      case 'vault':
        return (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FFF4E5] text-[#B45309]">
            Credit Vault
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="model-selector-container">
      {/* Trigger Button */}
      <button
        id="model-selector-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5E2DC] bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#1F1E1D] text-xs md:text-sm font-medium transition-all shadow-xs"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#736E67]" />
          <span className="font-semibold text-[#1F1E1D] truncate max-w-[130px] sm:max-w-[170px]">
            {currentModel.name}
          </span>
        </div>
        {getTierBadge(currentModel.tier)}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#858079] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="model-selector-dropdown"
          className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-[330px] sm:w-[380px] bg-[#FBF9F5] border border-[#E5E2DC] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#55504A]">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Multi-Tier Model Selector</span>
            </div>
            <div className="text-[11px] text-[#736E67]">
              Wallet: <span className="font-semibold text-[#1F1E1D]">{userCredits} Credits</span>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2 space-y-3">
            {/* Free Tier Group */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span>Free Tier Models</span>
                <span className="text-[10px] text-emerald-600 font-normal">No credits required</span>
              </div>
              <div className="space-y-1 mt-0.5">
                {freeModels.map((model) => (
                  <button
                    key={model.id}
                    id={`model-option-${model.id}`}
                    type="button"
                    onClick={() => handleModelClick(model)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      selectedModelId === model.id
                        ? 'bg-[#EFECE6] text-[#1F1E1D] font-medium'
                        : 'hover:bg-[#F3EFEA] text-[#3D3A37]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#1F1E1D]">{model.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                          {model.contextWindow}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736E67] truncate mt-0.5">
                        {model.description}
                      </p>
                    </div>
                    {selectedModelId === model.id && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pro Tier Group */}
            <div className="border-t border-[#E5E2DC] pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span>Pro Subscription Models</span>
                <span className="text-[10px] text-[#0A66C2] font-medium">Included in Pro</span>
              </div>
              <div className="space-y-1 mt-0.5">
                {proModels.map((model) => (
                  <button
                    key={model.id}
                    id={`model-option-${model.id}`}
                    type="button"
                    onClick={() => handleModelClick(model)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      selectedModelId === model.id
                        ? 'bg-[#E8F3FF] text-[#0A66C2] font-medium'
                        : 'hover:bg-[#F3EFEA] text-[#3D3A37]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#1F1E1D]">{model.name}</span>
                        {model.supportsThinking && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] font-medium flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Thinking
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                          {model.contextWindow}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#736E67] truncate mt-0.5">
                        {model.description}
                      </p>
                    </div>
                    {selectedModelId === model.id ? (
                      <Check className="w-4 h-4 text-[#0A66C2] shrink-0" />
                    ) : (
                      <span className="text-[10px] text-[#0A66C2] font-medium shrink-0">
                        {model.costPerQueryCredits} cr/q
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit Vault Group */}
            <div className="border-t border-[#E5E2DC] pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between">
                <span>Credit Vault (Ultra Frontier)</span>
                <span className="text-[10px] text-[#B45309] font-medium">Pay per query</span>
              </div>
              <div className="space-y-1 mt-0.5">
                {vaultModels.map((model) => {
                  const hasEnough = userCredits >= model.costPerQueryCredits;
                  return (
                    <button
                      key={model.id}
                      id={`model-option-${model.id}`}
                      type="button"
                      onClick={() => handleModelClick(model)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        selectedModelId === model.id
                          ? 'bg-[#FFF4E5] text-[#B45309] font-medium'
                          : 'hover:bg-[#F3EFEA] text-[#3D3A37]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#1F1E1D]">{model.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#B45309] font-medium">
                            {model.badge}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECE8E1] text-[#736E67]">
                            {model.contextWindow}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#736E67] truncate mt-0.5">
                          {model.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-semibold text-[#B45309]">
                          {model.costPerQueryCredits} cr
                        </span>
                        {!hasEnough && (
                          <Lock className="w-3.5 h-3.5 text-[#B45309]" />
                        )}
                        {selectedModelId === model.id && (
                          <Check className="w-4 h-4 text-[#B45309]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Top-up link in footer */}
          <div className="p-2.5 bg-[#F3EFEA] border-t border-[#E5E2DC] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#736E67]">Need higher capacity?</span>
            <button
              id="dropdown-topup-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPaymentModal('vault');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
            >
              Top Up via eSewa / Khalti &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
