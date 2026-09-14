'use client';

import React, { useState } from 'react';
import {
  Search,
  Globe,
  BookOpen,
  Check,
  Loader2,
  ShieldCheck,
  Flag,
  FileText,
} from 'lucide-react';
import { UserProfileSettings, SearchProvider, CitationDensity } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ResearcherTabProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
}

export default function ResearcherTab({
  profile,
  onUpdateProfile,
}: ResearcherTabProps) {
  const [provider, setProvider] = useState<SearchProvider>(profile.searchProvider);
  const [nepaliBias, setNepaliBias] = useState(profile.nepaliGroundingBias);
  const [citationDensity, setCitationDensity] = useState<CitationDensity>(profile.citationDensity);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<UserProfileSettings> = {
      searchProvider: provider,
      nepaliGroundingBias: nepaliBias,
      citationDensity,
    };

    try {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      onUpdateProfile(updates);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save researcher settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Researcher & Grounding Engine</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Configure real-time web verification, localized South Asian index prioritization, and citation formats.
        </p>
      </div>

      {/* Search Provider Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
          <Search className="w-4 h-4 text-emerald-600" />
          <span>Live Web Search Provider</span>
        </label>
        <p className="text-xs text-[#736E67]">
          Select the query retrieval backend for grounding claims in real-time academic and current affairs research.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Tavily */}
          <div
            onClick={() => setProvider('tavily')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              provider === 'tavily'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600/30'
                : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1E1D]">Tavily AI (Default & Recommended)</span>
                {provider === 'tavily' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-[#736E67] mt-1.5 leading-relaxed">
                Purpose-built for LLM RAG pipelines. Filters scrapers and ad farms, providing clean parsed markdown snippets.
              </p>
            </div>
            <span className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">
              Low Latency • Clean RAG
            </span>
          </div>

          {/* Serper / SearXNG */}
          <div
            onClick={() => setProvider('serper_searxng')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              provider === 'serper_searxng'
                ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1E1D]">Serper / SearXNG Open Index</span>
                {provider === 'serper_searxng' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <p className="text-[11px] text-[#736E67] mt-1.5 leading-relaxed">
                Deep Google index scraping with multi-engine SearXNG meta-search fallback for niche local forums.
              </p>
            </div>
            <span className="mt-2 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded w-fit border border-blue-200">
              Raw Broad Index
            </span>
          </div>
        </div>
      </div>

      {/* Nepali Source Grounding Bias (gl=np) */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-emerald-950">
                Nepali Source Grounding Bias (gl=np)
              </h4>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900 text-[10px] font-mono font-bold">
                RECOMMENDED
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              When enabled, queries prioritize official Nepali entities (Nepal Rastra Bank, MoCIT, Ministry of Law),
              university repositories (TU, KU, IOE), and accredited Nepali publications (<em>OnlineKhabar</em>, <em>eKantipur</em>, <em>The Kathmandu Post</em>).
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={nepaliBias}
              onChange={(e) => setNepaliBias(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#D5D0C7] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D5D0C7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-emerald-900">
          <span className="px-2 py-0.5 rounded bg-white/70 border border-emerald-200">nrb.org.np</span>
          <span className="px-2 py-0.5 rounded bg-white/70 border border-emerald-200">tu.edu.np</span>
          <span className="px-2 py-0.5 rounded bg-white/70 border border-emerald-200">lawcommission.gov.np</span>
          <span className="px-2 py-0.5 rounded bg-white/70 border border-emerald-200">onlinekhabar.com</span>
        </div>
      </div>

      {/* Citation Density */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-purple-700" />
          <span>Citation Density & Layout Format</span>
        </label>
        <p className="text-xs text-[#736E67]">
          Determine how verified citations are presented inside assistant research answers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div
            onClick={() => setCitationDensity('inline_brackets')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              citationDensity === 'inline_brackets'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600/30'
                : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F1E1D]">Inline Bracket Badges</span>
              {citationDensity === 'inline_brackets' && <Check className="w-3.5 h-3.5 text-purple-700" />}
            </div>
            <p className="text-[11px] text-[#736E67] mt-1 leading-snug">
              Displays interactive pill buttons directly after asserted claims: <code className="bg-[#FAF8F5] px-1 py-0.5 rounded text-purple-800">[Source: NRB]</code>.
            </p>
          </div>

          <div
            onClick={() => setCitationDensity('footnote_bibliography')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              citationDensity === 'footnote_bibliography'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600/30'
                : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F1E1D]">Footnote Bibliography Style</span>
              {citationDensity === 'footnote_bibliography' && <Check className="w-3.5 h-3.5 text-purple-700" />}
            </div>
            <p className="text-[11px] text-[#736E67] mt-1 leading-snug">
              Superscript numeric markers (<code className="bg-[#FAF8F5] px-1 py-0.5 rounded text-purple-800">^[1]</code>) with complete academic bibliography at bottom.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E2DC]">
        {showSaved ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Researcher preferences synced!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#858079]">
            Active when in Researcher Mode
          </span>
        )}

        <button
          id="researcher-settings-save-btn"
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
