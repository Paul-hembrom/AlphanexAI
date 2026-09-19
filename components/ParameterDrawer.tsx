'use client';

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  Globe,
  Coins,
  Cpu,
  Layers,
} from 'lucide-react';
import { WorkspaceParams, WorkMode, ModelInfo, BuildStack } from '@/lib/types';
import { DEFAULT_SYSTEM_INSTRUCTIONS } from '@/lib/constants';
import BuildStackSelector from './BuildStackSelector';

interface ParameterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  params: WorkspaceParams;
  onChangeParams: (params: WorkspaceParams) => void;
  currentMode: WorkMode;
  selectedModel: ModelInfo;
  buildStack?: BuildStack;
  onChangeBuildStack?: (stack: BuildStack) => void;
}

export default function ParameterDrawer({
  isOpen,
  onClose,
  params,
  onChangeParams,
  currentMode,
  selectedModel,
  buildStack,
  onChangeBuildStack,
}: ParameterDrawerProps) {
  const [isSysInstOpen, setIsSysInstOpen] = useState(true);

  if (!isOpen) return null;

  const handleResetSystemInstruction = () => {
    onChangeParams({
      ...params,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS[currentMode],
    });
  };

  // Estimated credits per output token budget
  const estimatedTokenCost =
    selectedModel.costPerQueryCredits > 0
      ? (
          (params.maxOutputTokens / 4096) *
          selectedModel.costPerQueryCredits
        ).toFixed(2)
      : '0.00 (Free)';

  return (
    <aside
      id="parameter-inspector-drawer"
      className="fixed top-14 right-0 bottom-0 w-80 sm:w-96 bg-[#FBF9F5] border-l border-[#E5E2DC] shadow-2xl z-40 flex flex-col transition-all overflow-hidden"
    >
      {/* Drawer Header (Google AI Studio style) */}
      <div className="px-4 py-3 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#1F1E1D]" />
          <div>
            <h3 className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider">
              Run Settings & Parameters
            </h3>
            <span className="text-[10px] text-[#736E67]">
              Google AI Studio Inspector
            </span>
          </div>
        </div>

        <button
          id="close-param-drawer-btn"
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[#E5E2DC] text-[#736E67] hover:text-[#1F1E1D]"
          title="Close Parameters"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Model Meta Summary */}
        <div className="p-3 rounded-xl border border-[#E5E2DC] bg-[#FAF8F3] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#858079] uppercase font-bold tracking-wider">
              Active Model
            </span>
            <div className="text-xs font-semibold text-[#1F1E1D]">
              {selectedModel.name}
            </div>
            <span className="text-[11px] text-[#736E67]">
              Context: {selectedModel.contextWindow}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#ECE8E1] text-[#55504A] font-medium">
            {selectedModel.provider}
          </span>
        </div>

        {/* Target Build Stack (Developer Mode) */}
        {currentMode === 'developer' && (
          <div className="p-3 rounded-xl border border-[#E5E2DC] bg-[#FAF8F3] space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#1F1E1D]">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Target Build Stack</span>
            </div>
            <p className="text-[11px] text-[#736E67]">
              Choose whether to compile a Web application (HTML/CSS/JS, React, Vue, Next.js) or Mobile app source files (React Native, Flutter).
            </p>
            <BuildStackSelector
              currentStack={buildStack}
              onChangeStack={onChangeBuildStack}
            />
          </div>
        )}

        {/* System Instructions Accordion */}
        <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF8F3] overflow-hidden">
          <button
            id="accordion-system-instruction-toggle"
            type="button"
            onClick={() => setIsSysInstOpen(!isSysInstOpen)}
            className="w-full px-3 py-2.5 flex items-center justify-between font-semibold text-[#1F1E1D] hover:bg-[#F3EFEA] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>System Instructions</span>
            </div>
            {isSysInstOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#858079]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#858079]" />
            )}
          </button>

          {isSysInstOpen && (
            <div className="p-3 border-t border-[#E5E2DC] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#736E67]">
                <span>Mode: {currentMode}</span>
                <button
                  type="button"
                  onClick={handleResetSystemInstruction}
                  className="text-amber-800 hover:text-amber-900 font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset to Mode Default</span>
                </button>
              </div>

              <textarea
                id="system-instruction-textarea"
                rows={5}
                value={params.systemInstruction}
                onChange={(e) =>
                  onChangeParams({ ...params, systemInstruction: e.target.value })
                }
                className="w-full p-2.5 rounded-lg border border-[#E5E2DC] bg-[#FDFBF7] text-[#1F1E1D] font-mono text-[11px] leading-relaxed resize-none outline-hidden focus:border-[#B8B2A6]"
                placeholder="Instructions guiding model persona and response format..."
              />
            </div>
          )}
        </div>

        {/* Slider 1: Temperature */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="temperature-slider"
              className="font-semibold text-[#1F1E1D] flex items-center gap-1"
            >
              <span>Temperature</span>
              <span className="text-[#736E67] font-mono">({params.temperature.toFixed(2)})</span>
            </label>
            <span className="text-[10px] text-[#858079]">
              {params.temperature < 0.4
                ? 'Deterministic'
                : params.temperature < 1.0
                ? 'Balanced'
                : 'Creative'}
            </span>
          </div>

          <input
            id="temperature-slider"
            type="range"
            min="0.0"
            max="2.0"
            step="0.05"
            value={params.temperature}
            onChange={(e) =>
              onChangeParams({
                ...params,
                temperature: parseFloat(e.target.value),
              })
            }
            className="w-full accent-[#1F1E1D] cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-[#858079] px-0.5">
            <span>0.0 (Strict / Code)</span>
            <span>1.0</span>
            <span>2.0 (High Variety)</span>
          </div>
        </div>

        {/* Slider 2: Max Output Tokens */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="max-tokens-slider"
              className="font-semibold text-[#1F1E1D] flex items-center gap-1"
            >
              <span>Max Output Tokens</span>
              <span className="text-[#736E67] font-mono">
                ({params.maxOutputTokens.toLocaleString()})
              </span>
            </label>
            <span className="text-[10px] text-[#858079]">Max: 32,768</span>
          </div>

          <input
            id="max-tokens-slider"
            type="range"
            min="1024"
            max="32768"
            step="1024"
            value={params.maxOutputTokens}
            onChange={(e) =>
              onChangeParams({
                ...params,
                maxOutputTokens: parseInt(e.target.value, 10),
              })
            }
            className="w-full accent-[#1F1E1D] cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-[#858079] px-0.5">
            <span>1k</span>
            <span>8k</span>
            <span>16k</span>
            <span>32k</span>
          </div>
        </div>

        {/* Slider 3: Top-P */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="top-p-slider"
              className="font-semibold text-[#1F1E1D]"
            >
              Top-P Sampling: <span className="text-[#736E67] font-mono">{params.topP}</span>
            </label>
            <span className="text-[10px] text-[#858079]">Nucleus Cutoff</span>
          </div>

          <input
            id="top-p-slider"
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={params.topP}
            onChange={(e) =>
              onChangeParams({
                ...params,
                topP: parseFloat(e.target.value),
              })
            }
            className="w-full accent-[#1F1E1D] cursor-pointer"
          />
        </div>

        {/* Live Search Grounding Toggle (Researcher feature) */}
        <div className="p-3 rounded-xl border border-[#E5E2DC] bg-[#FAF8F3] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-[#1F1E1D]">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>SERP Search Grounding</span>
            </div>
            <input
              id="grounding-toggle"
              type="checkbox"
              checked={params.groundingEnabled || currentMode === 'researcher'}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  groundingEnabled: e.target.checked,
                })
              }
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-[#736E67] leading-relaxed">
            Attaches real-time search grounding and institutional citation badges to every response.
          </p>
        </div>

        {/* Live Token & Cost Calculator Box */}
        <div
          id="token-cost-calculator"
          className="p-3.5 rounded-xl border border-amber-300/80 bg-amber-50/60 space-y-2 text-xs text-amber-950"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Coins className="w-3.5 h-3.5 text-amber-700" />
            <span>Live Token & Credit Estimator</span>
          </div>

          <div className="space-y-1 text-[11px] text-amber-900">
            <div className="flex justify-between">
              <span>Token Window:</span>
              <span className="font-mono">{params.maxOutputTokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Model Tier:</span>
              <span className="font-semibold uppercase">{selectedModel.tier}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-amber-200/60 font-semibold text-xs">
              <span>Est. Cost per Query:</span>
              <span className="text-amber-950 font-bold">{estimatedTokenCost}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
