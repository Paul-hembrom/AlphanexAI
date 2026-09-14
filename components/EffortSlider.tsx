'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Brain, ChevronDown, Check, Zap } from 'lucide-react';
import { ReasoningEffort, WorkMode } from '@/lib/types';

interface EffortSliderProps {
  effort: ReasoningEffort;
  onChangeEffort: (effort: ReasoningEffort) => void;
  supportsThinking: boolean;
  modelName: string;
  currentMode?: WorkMode;
}

export default function EffortSlider({
  effort,
  onChangeEffort,
  supportsThinking,
  modelName,
  currentMode = 'developer',
}: EffortSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effortConfigs: Record<
    ReasoningEffort,
    {
      label: string;
      multiplier: string;
      tokenIndicator: string;
      warningSign?: string;
      desc: string;
      badgeClass: string;
    }
  > = {
    Low: {
      label: 'Low',
      multiplier: '1x',
      tokenIndicator: '2k max tokens',
      desc: 'Fast baseline scan for quick and direct responses.',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    },
    Medium: {
      label: 'Medium',
      multiplier: '2x',
      tokenIndicator: '8k max tokens',
      warningSign: '⚠️',
      desc: 'Balanced multi-pass reasoning with verified citations.',
      badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200',
    },
    High: {
      label: 'High',
      multiplier: '4x',
      tokenIndicator: '8k max tokens',
      warningSign: '⚠️',
      desc: 'Comprehensive due diligence and deep analytical breakdown.',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    },
    Extra: {
      label: 'Extra',
      multiplier: '6x',
      tokenIndicator: '10k max tokens',
      warningSign: '⚠️',
      desc: 'Expanded 10,240 max tokens for intensive cross-domain search.',
      badgeClass: 'bg-orange-50 text-orange-800 border border-orange-200',
    },
    Max: {
      label: 'Max',
      multiplier: '10x',
      tokenIndicator: '12k max tokens',
      warningSign: '🚨',
      desc: 'Exhaustive sandbox verification and full dossier synthesis.',
      badgeClass: 'bg-red-50 text-red-800 border border-red-200',
    },
  };

  const levels: ReasoningEffort[] = ['Low', 'Medium', 'High', 'Extra', 'Max'];

  if (!supportsThinking && currentMode !== 'researcher') {
    return (
      <div
        id="effort-slider-disabled"
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E2DC] bg-[#F7F5F0] text-[#9E9890] text-xs cursor-not-allowed select-none"
        title={`${modelName} operates in standard autoregressive mode. Select Qwen 3.7 Flash, DeepSeek V4.1 Flash, Gemini 3.8 Flash, or Claude Opus 5 for thinking tokens.`}
      >
        <Brain className="w-3.5 h-3.5 text-[#B8B2A6]" />
        <span className="font-medium">Thinking: N/A</span>
      </div>
    );
  }

  const currentCfg = effortConfigs[effort] || effortConfigs.Medium;

  return (
    <div className="relative" ref={dropdownRef} id="efforts-menu-container">
      {/* Dropdown Menu Trigger Button */}
      <button
        id="efforts-dropdown-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E2DC] bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#1F1E1D] text-xs font-medium transition-all shadow-xs cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={`Efforts: ${effort} (${currentCfg.multiplier}) - Click to select effort tag`}
      >
        <Brain className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
        <span className="font-semibold text-[#1F1E1D]">Efforts</span>
        <span
          className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${currentCfg.badgeClass}`}
        >
          {effort} <span className="opacity-70 ml-1">({currentCfg.multiplier})</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#858079] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="efforts-dropdown-menu"
          className="absolute right-0 mt-1.5 w-64 sm:w-72 bg-[#FBF9F5] border border-[#E5E2DC] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
        >
          <div className="px-3 py-2 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#55504A]">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Reasoning & Search Efforts</span>
            </div>
            <span className="text-[10px] text-[#858079] font-mono">5 Tags</span>
          </div>

          <div className="p-1.5 space-y-1">
            {levels.map((level) => {
              const cfg = effortConfigs[level];
              const isSelected = effort === level;
              return (
                <button
                  key={level}
                  id={`effort-option-${level.toLowerCase()}`}
                  type="button"
                  onClick={() => {
                    onChangeEffort(level);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#F4F1EA] border border-[#D5D0C7] text-[#1F1E1D]'
                      : 'hover:bg-[#F3EFEA] text-[#4D4943]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-[#1F1E1D]">
                        {level}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${cfg.badgeClass}`}
                      >
                        {cfg.multiplier}
                      </span>
                      <span className="text-[10px] font-mono text-[#736E67]">
                        {cfg.tokenIndicator}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#635E57] mt-0.5 leading-snug">
                      {cfg.desc}
                    </p>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

