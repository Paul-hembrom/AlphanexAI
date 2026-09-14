'use client';

import React, { useState } from 'react';
import {
  Github,
  Terminal,
  GitPullRequest,
  Check,
  Loader2,
  Cpu,
  Cloud,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  GitBranch,
} from 'lucide-react';
import { UserProfileSettings, ExecutionEngine } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface DeveloperTabProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
}

export default function DeveloperTab({
  profile,
  onUpdateProfile,
}: DeveloperTabProps) {
  const [defaultBranch, setDefaultBranch] = useState(profile.defaultPushBranch || 'main');
  const [autoPr, setAutoPr] = useState(profile.autoGeneratePrOnBugFix ?? true);
  const [engine, setEngine] = useState<ExecutionEngine>(profile.executionEngine || profile.codeExecutionEngine || 'pyodide_wasm');
  const [allowPip, setAllowPip] = useState(profile.allowSandboxPipInstall ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<UserProfileSettings> = {
      defaultPushBranch: defaultBranch,
      autoGeneratePrOnBugFix: autoPr,
      executionEngine: engine,
      allowSandboxPipInstall: allowPip,
    };

    try {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      onUpdateProfile(updates);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save developer settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Developer & Execution Runtime</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Configure GitHub repo integration, automated PR pipelines, and runtime Python sandbox environments.
        </p>
      </div>

      {/* GitHub Integration Manager */}
      <div className="p-4 rounded-xl border border-[#E5E2DC] bg-[#FAF8F5] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F1E1D] text-white flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#1F1E1D]">GitHub Integration</h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Connected as @{profile.githubUsername}
                </span>
              </div>
              <p className="text-xs text-[#736E67] mt-0.5">
                OAuth permission granted for pull request generation & diff review.
              </p>
            </div>
          </div>

          <a
            href={`https://github.com/${profile.githubUsername}`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg border border-[#D5D0C7] hover:bg-[#F3EFEA] text-[#736E67] hover:text-[#1F1E1D] transition-colors"
            title="Open GitHub Profile"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Branch Preference & Auto PR Toggle */}
        <div className="pt-3 border-t border-[#EAE6DF] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1F1E1D] mb-1 flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-[#736E67]" />
              <span>Default Push Target Branch</span>
            </label>
            <select
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-white text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6]"
            >
              <option value="main">main (production release)</option>
              <option value="dev">dev (development branch)</option>
              <option value="staging">staging (pre-release QA)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg border border-[#E5E2DC] bg-white hover:bg-[#FAF8F5]">
              <input
                type="checkbox"
                checked={autoPr}
                onChange={(e) => setAutoPr(e.target.checked)}
                className="w-4 h-4 rounded border-[#D5D0C7] text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-[#1F1E1D] block">Auto-generate Pull Requests</span>
                <span className="text-[#736E67]">Create PR branch upon verifying bug fixes</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Execution Engine Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1E1D]">
          <Terminal className="w-4 h-4 text-amber-600" />
          <span>Execution Engine Selector</span>
        </div>
        <p className="text-xs text-[#736E67]">
          Select where the Python Terminal executes code snippets.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* WASM */}
          <div
            onClick={() => setEngine('wasm')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              engine === 'wasm'
                ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600/30'
                : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-[#1F1E1D]">Client-side WASM (Pyodide)</span>
                </div>
                {engine === 'wasm' && <Check className="w-3.5 h-3.5 text-amber-700" />}
              </div>
              <p className="text-[11px] text-[#736E67] mt-1.5 leading-relaxed">
                Free, zero-latency execution directly inside your browser. No server roundtrips or credit consumption.
              </p>
            </div>
            <div className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">
              0 Credits • Instant
            </div>
          </div>

          {/* Cloud Container */}
          <div
            onClick={() => setEngine('cloud_sandbox')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              engine === 'cloud_sandbox'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600/30'
                : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-[#1F1E1D]">Cloud Sandbox (E2B Container)</span>
                </div>
                {engine === 'cloud_sandbox' && <Check className="w-3.5 h-3.5 text-purple-700" />}
              </div>
              <p className="text-[11px] text-[#736E67] mt-1.5 leading-relaxed">
                Dedicated Linux microVM with full socket networking, filesystem persistence, and C-extension compilation.
              </p>
            </div>
            <div className="mt-2 text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded w-fit border border-purple-200">
              Pro Tier • 1 Credit/min
            </div>
          </div>
        </div>

        {/* Egress Permissions Toggle */}
        <div className="p-3 rounded-xl border border-[#E5E2DC] bg-white flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#1F1E1D] block">
              Network Egress for Python Packages (pip install)
            </span>
            <span className="text-[11px] text-[#736E67]">
              Permit terminal sandboxes to download wheels from PyPI and external API endpoints.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={allowPip}
              onChange={(e) => setAllowPip(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#E5E2DC] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D5D0C7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E2DC]">
        {showSaved ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Developer settings synced!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#858079]">
            Controls Python WASM & GitHub actions in Developer Mode
          </span>
        )}

        <button
          id="developer-settings-save-btn"
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
