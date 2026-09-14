'use client';

import React from 'react';
import { Sparkles, Brain, Info } from 'lucide-react';
import { ReasoningEffort } from '@/lib/types';

interface EffortSliderProps {
  effort: ReasoningEffort;
  onChangeEffort: (effort: ReasoningEffort) => void;
  supportsThinking: boolean;
  modelName: string;
}

export default function EffortSlider({
  effort,
  onChangeEffort,
  supportsThinking,
  modelName,
}: EffortSliderProps) {
  const effortConfigs: Record<
    ReasoningEffort,
    { label: string; tokenIndicator: string; desc: string }
  > = {
    Low: {
      label: 'Low',
      tokenIndicator: '~1,024 tok',
      desc: 'Fast, lightweight thinking tokens for straightforward logic & basic fixes.',
    },
    Medium: {
      label: 'Medium',
      tokenIndicator: '~4,096 tok',
      desc: 'Balanced reasoning depth for nuanced code analysis & multi-step proofs.',
    },
    Max: {
      label: 'Max',
      tokenIndicator: '~16,384 tok',
      desc: 'Deepest test-time compute for formal proofs, deep refactoring & complex research.',
    },
  };

  if (!supportsThinking) {
    return (
      <div
        id="effort-slider-disabled"
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E5E2DC] bg-[#F7F5F0] text-[#9E9890] text-xs cursor-not-allowed select-none"
        title={`${modelName} operates in standard autoregressive mode (no thinking tokens). Select Claude 3.7, DeepSeek-R1, or Frontier models to enable test-time reasoning.`}
      >
        <Brain className="w-3.5 h-3.5 text-[#B8B2A6]" />
        <span className="font-medium">Thinking: N/A</span>
      </div>
    );
  }

  return (
    <div
      id="effort-slider-active"
      className="flex items-center gap-1.5 bg-[#F3EFEA] p-0.5 rounded-lg border border-[#E5E2DC]"
      title={`Reasoning Effort: ${effortConfigs[effort].desc}`}
    >
      <div className="flex items-center gap-1 pl-1.5 pr-1 text-[11px] font-semibold text-[#55504A]">
        <Brain className="w-3 h-3 text-[#B45309]" />
        <span className="hidden xl:inline">Reasoning:</span>
      </div>

      <div className="flex items-center gap-0.5" role="group" aria-label="Reasoning Effort">
        {(['Low', 'Medium', 'Max'] as ReasoningEffort[]).map((level) => {
          const isActive = effort === level;
          return (
            <button
              key={level}
              id={`effort-btn-${level.toLowerCase()}`}
              type="button"
              onClick={() => onChangeEffort(level)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                isActive
                  ? 'bg-[#FBF9F5] text-[#1F1E1D] shadow-xs font-semibold border border-[#E5E2DC]'
                  : 'text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#ECE8E1]'
              }`}
            >
              <span>{level}</span>
              {isActive && (
                <span className="hidden sm:inline-block text-[10px] text-[#B45309] font-normal">
                  ({effortConfigs[level].tokenIndicator})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
