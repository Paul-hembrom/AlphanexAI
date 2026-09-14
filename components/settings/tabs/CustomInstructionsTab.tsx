'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Languages,
  Check,
  Loader2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { UserProfileSettings, OutputLanguageTone } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface CustomInstructionsTabProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
}

const TONE_OPTIONS: { value: OutputLanguageTone; label: string; desc: string; sample: string }[] = [
  {
    value: 'Standard English',
    label: 'Standard English',
    desc: 'High clarity, concise, standard global technical English.',
    sample: '"Here is the optimized signature verification script using HMAC-SHA256."',
  },
  {
    value: 'Nepali (Devanagari)',
    label: 'Nepali (Devanagari)',
    desc: 'Native Devanagari script output for documents, translations, and policy analysis.',
    sample: '"यहाँ ईसेवा भुक्तानी प्रमाणीकरणको लागि शुद्ध गरिएको कोड प्रस्तुत गरिएको छ।"',
  },
  {
    value: 'Romanized Nepali (Conversational)',
    label: 'Romanized Nepali (Conversational)',
    desc: 'Casual Romanized Nepali common among developers and community chats in Nepal.',
    sample: '"Yo code ma HMAC signature verify garda base64 decode garna birseko thiyo."',
  },
  {
    value: 'Bilingual (English with Nepali explanations)',
    label: 'Bilingual (English + Nepali Context)',
    desc: 'Technical code and logic in English with clarifying explanations in Nepali.',
    sample: '"The function handles HMAC-SHA256. (यसले eSewa v2 को signature mismatch समस्या समाधान गर्छ।)"',
  },
];

const PRESETS = [
  {
    name: 'Production Full-Stack',
    instruction:
      'Always default to TypeScript, FastAPI, or modern Python. Omit conversational filler (no "Sure, I can help"). Provide type annotations, error boundary handling, and clear architectural diffs. Format formulas in LaTeX.',
  },
  {
    name: 'Academic Researcher',
    instruction:
      'Ground every assertion in peer-reviewed or verifiable South Asian data sources. Structure responses with methodology, critical findings, and inline citations. Prioritize objectivity and statistical rigor.',
  },
  {
    name: 'Concise Polymath',
    instruction:
      'Keep responses extremely concise and punchy. Prioritize bullet points, direct code blocks, and executive summaries. Never apologize or repeat user queries.',
  },
];

export default function CustomInstructionsTab({
  profile,
  onUpdateProfile,
}: CustomInstructionsTabProps) {
  const [instruction, setInstruction] = useState(profile.globalSystemInstruction);
  const [tone, setTone] = useState<OutputLanguageTone>(profile.outputLanguageTone);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<UserProfileSettings> = {
      globalSystemInstruction: instruction,
      outputLanguageTone: tone,
    };

    try {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      onUpdateProfile(updates);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save instructions:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Custom Instructions & System Personality</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Define universal behavior rules and linguistic tone preferences applied across all models and modes.
        </p>
      </div>

      {/* System Instruction Text Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Global System Instructions</span>
          </label>
          <span className="text-[11px] text-[#858079]">
            {instruction.length} characters
          </span>
        </div>

        <p className="text-xs text-[#736E67]">
          What would you like the AI to know about you and how it should respond?
        </p>

        <textarea
          id="custom-instruction-textarea"
          rows={5}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g., Always default to TypeScript/Python. Do not include conversational filler like 'Sure, I can help with that'. Format mathematical formulas in LaTeX."
          className="w-full p-3 rounded-xl border border-[#E5E2DC] bg-white text-xs font-mono text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6] leading-relaxed shadow-xs"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-[#858079] font-medium">Quick Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setInstruction(p.instruction)}
              className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E5E2DC] text-[11px] font-semibold text-[#55504A] transition-colors cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Language & Localization Preference */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1E1D]">
          <Languages className="w-4 h-4 text-emerald-600" />
          <span>Output Tone & Localization Preference</span>
        </div>
        <p className="text-xs text-[#736E67]">
          Control the default linguistic register for reasoning and generated responses.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {TONE_OPTIONS.map((opt) => {
            const isSelected = tone === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => setTone(opt.value)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-950' : 'text-[#1F1E1D]'}`}>
                      {opt.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                  </div>
                  <p className="text-[11px] text-[#736E67] mt-1 leading-snug">
                    {opt.desc}
                  </p>
                </div>

                <div className="mt-2.5 p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE6DF] text-[10px] italic text-[#55504A]">
                  {opt.sample}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E2DC]">
        {showSaved ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Instructions synchronized with Supabase!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#858079]">
            Applies universally across all threads
          </span>
        )}

        <button
          id="custom-instructions-save-btn"
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}
