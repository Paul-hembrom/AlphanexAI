'use client';

import React, { useState } from 'react';
import {
  Palette,
  Type,
  SplitSquareVertical,
  Check,
  Loader2,
  Sun,
  Moon,
  Laptop,
  Code2,
  Sparkles,
} from 'lucide-react';
import { UserProfileSettings, WorkspaceTheme, ReadingTypography } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AppearanceTabProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
}

const THEME_OPTIONS: { value: WorkspaceTheme; label: string; desc: string; icon: any }[] = [
  {
    value: 'warm_stone',
    label: 'Warm Stone (Claude Signature)',
    desc: 'Off-white canvas (#FBF9F5) with warm parchment borders and graphite typography.',
    icon: Sun,
  },
  {
    value: 'true_dark',
    label: 'True Dark (OLED)',
    desc: 'Deep obsidian backdrop with muted slate borders, reducing eye strain during night sprints.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System Adaptive',
    desc: 'Automatically synchronizes with your OS light/dark schedule.',
    icon: Laptop,
  },
];

const TYPOGRAPHY_OPTIONS: { value: ReadingTypography; label: string; preview: string; fontClass: string }[] = [
  {
    value: 'inter',
    label: 'Standard Sans (Inter / Clean Neo-Grotesque)',
    preview: 'The quick brown fox jumps over the lazy dog (1234567890)',
    fontClass: 'font-sans',
  },
  {
    value: 'jetbrains_mono',
    label: 'Developer Monospace (JetBrains Mono)',
    preview: 'const signature = hmac.new(key, msg, hashlib.sha256)',
    fontClass: 'font-mono',
  },
  {
    value: 'opendyslexic',
    label: 'OpenDyslexic (High Legibility)',
    preview: 'Designed to mitigate letter confusion and enhance scanning rhythm.',
    fontClass: 'font-sans tracking-wide',
  },
];

export default function AppearanceTab({
  profile,
  onUpdateProfile,
}: AppearanceTabProps) {
  const [theme, setTheme] = useState<WorkspaceTheme>(profile.theme);
  const [typography, setTypography] = useState<ReadingTypography>(profile.typography);
  const [autoDiff, setAutoDiff] = useState(profile.autoOpenDiffOnLargeChanges);
  const [inlineRun, setInlineRun] = useState(profile.displayInlineRunCodeButton);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<UserProfileSettings> = {
      theme,
      typography,
      autoOpenDiffOnLargeChanges: autoDiff,
      displayInlineRunCodeButton: inlineRun,
    };

    try {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      onUpdateProfile(updates);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save appearance:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Artifacts & Workspace UI</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Customize UI aesthetics, font pairings, and canvas auto-trigger behaviors.
        </p>
      </div>

      {/* Theme Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-purple-600" />
          <span>Canvas Theme Palette</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = theme === opt.value;
            const Icon = opt.icon;
            return (
              <div
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600/30'
                    : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-700' : 'text-[#736E67]'}`} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-700" />}
                  </div>
                  <h4 className="text-xs font-bold text-[#1F1E1D] mt-2">{opt.label}</h4>
                  <p className="text-[11px] text-[#736E67] mt-1 leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reading Typography */}
      <div className="space-y-2.5 pt-1">
        <label className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
          <Type className="w-4 h-4 text-blue-600" />
          <span>Reading & Interface Typography</span>
        </label>

        <div className="space-y-2">
          {TYPOGRAPHY_OPTIONS.map((opt) => {
            const isSelected = typography === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => setTypography(opt.value)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7]'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1F1E1D] block">{opt.label}</span>
                  <span className={`text-[11px] text-[#736E67] ${opt.fontClass}`}>
                    {opt.preview}
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-3" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Artifacts & Diff Panel Behavior */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
          <SplitSquareVertical className="w-4 h-4 text-amber-600" />
          <span>Artifacts & Diff Panel Automation</span>
        </label>

        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 rounded-xl border border-[#E5E2DC] bg-white hover:bg-[#FAF8F5] cursor-pointer">
            <div className="space-y-0.5 pr-4">
              <span className="text-xs font-bold text-[#1F1E1D] block">
                Auto-open side-by-side Diff Viewer for large code modifications
              </span>
              <span className="text-[11px] text-[#736E67]">
                Automatically expands the Canvas right panel whenever suggested code diffs exceed 5 lines.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoDiff}
              onChange={(e) => setAutoDiff(e.target.checked)}
              className="w-4 h-4 rounded border-[#D5D0C7] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-[#E5E2DC] bg-white hover:bg-[#FAF8F5] cursor-pointer">
            <div className="space-y-0.5 pr-4">
              <span className="text-xs font-bold text-[#1F1E1D] block">
                Display &apos;Run Code&apos; button directly above in-chat code blocks
              </span>
              <span className="text-[11px] text-[#736E67]">
                Enables one-click execution of Python snippets into the Pyodide WASM terminal.
              </span>
            </div>
            <input
              type="checkbox"
              checked={inlineRun}
              onChange={(e) => setInlineRun(e.target.checked)}
              className="w-4 h-4 rounded border-[#D5D0C7] text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
            />
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E2DC]">
        {showSaved ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Appearance settings applied!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#858079]">
            Saved to Supabase preferences
          </span>
        )}

        <button
          id="appearance-settings-save-btn"
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
