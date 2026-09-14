'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  User,
  Mail,
  Briefcase,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Github,
  Globe,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { UserProfileSettings, WorkContext } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ProfileTabProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
  onExportData: () => void;
  onClearHistory: () => void;
}

const WORK_CONTEXT_OPTIONS: { value: WorkContext; label: string; desc: string }[] = [
  {
    value: 'Full-Stack Developer',
    label: 'Full-Stack Developer',
    desc: 'Optimizes responses for TypeScript, Python, FastAPI, Next.js, and API debugging.',
  },
  {
    value: 'AI / ML Researcher',
    label: 'AI / ML Researcher',
    desc: 'Prioritizes mathematical formulation, PyTorch, arXiv grounding, and test-time reasoning.',
  },
  {
    value: 'University Student (TU / KU / IOE)',
    label: 'University Student (TU / KU / IOE)',
    desc: 'Tailored for Tribhuvan University, Kathmandu University, and IOE engineering coursework.',
  },
  {
    value: 'Loksewa / Civil Prep',
    label: 'Loksewa / Civil Prep',
    desc: 'Focuses on Nepal constitution, governance, administrative policies, and official statistics.',
  },
  {
    value: 'Tech Freelancer / Agency Owner',
    label: 'Tech Freelancer / Agency Owner',
    desc: 'Tailored for client deliverables, clean documentation, and localized payment SDKs.',
  },
  {
    value: 'General Enthusiast',
    label: 'General Enthusiast',
    desc: 'Balanced conversational reasoning with high clarity and nuanced perspective.',
  },
];

export default function ProfileTab({
  profile,
  onUpdateProfile,
  onExportData,
  onClearHistory,
}: ProfileTabProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [workContext, setWorkContext] = useState<WorkContext>(profile.workContext);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<UserProfileSettings> = {
      fullName,
      workContext,
    };

    try {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      onUpdateProfile(updates);
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmClear = () => {
    if (deleteInputText.trim() !== 'DELETE') return;
    setIsDeleting(true);
    setTimeout(() => {
      onClearHistory();
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInputText('');
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Tab Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Profile & Work Context</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Manage your verified identity, educational background, and AI personalization context.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-4 rounded-xl border border-[#E5E2DC] bg-[#FAF8F5] space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <Image
              src={profile.avatarUrl}
              alt={profile.fullName}
              width={56}
              height={56}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
              referrerPolicy="no-referrer"
            />
            <span
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
              title="Identity verified & active"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#1F1E1D]">{profile.fullName}</h4>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-semibold">
                Synced via Google
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#736E67]">
              <Mail className="w-3.5 h-3.5" />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#858079]">
              <span className="flex items-center gap-1">
                <Github className="w-3 h-3 text-[#1F1E1D]" />
                @{profile.githubUsername}
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">Kathmandu, Nepal</span>
            </div>
          </div>
        </div>

        {/* Editable Name Field */}
        <div className="pt-2 border-t border-[#EAE6DF] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1F1E1D] mb-1">
              Display Name
            </label>
            <div className="relative">
              <input
                id="settings-profile-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-white text-[#1F1E1D] outline-hidden focus:border-[#B8B2A6]"
                placeholder="Enter your name"
              />
              <User className="w-3.5 h-3.5 text-[#A39E93] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1F1E1D] mb-1">
              Primary Email (Read-Only)
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#F3EFEA] text-[#736E67] cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Work Context Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1E1D]">
          <Briefcase className="w-4 h-4 text-purple-700" />
          <span>Work Context & Domain Bias</span>
        </div>
        <p className="text-xs text-[#736E67]">
          Models will subconsciously adapt coding standards, framework assumptions, and examples to your selected role.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {WORK_CONTEXT_OPTIONS.map((opt) => {
            const isSelected = workContext === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWorkContext(opt.value)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                    : 'border-[#E5E2DC] bg-white hover:border-[#D5D0C7] hover:bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-purple-900' : 'text-[#1F1E1D]'}`}>
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />}
                </div>
                <p className="text-[11px] text-[#736E67] mt-1 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Trigger Button */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E5E2DC]">
        {showSavedNotification ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile saved to Supabase!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#858079]">
            Saved to Supabase <code className="font-mono bg-[#EFECE6] px-1 py-0.5 rounded">profiles</code> table
          </span>
        )}

        <button
          id="profile-save-btn"
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33302C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Data Export & Account Wipe Section */}
      <div className="pt-4 border-t border-[#E5E2DC] space-y-3">
        <h4 className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider">
          Data Management & Archival
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* JSON Export */}
          <div className="p-3.5 rounded-xl border border-[#E5E2DC] bg-white flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F1E1D]">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export Chat Workspace (JSON)</span>
              </div>
              <p className="text-[11px] text-[#736E67] mt-1 leading-relaxed">
                Download an export package of all chat threads, code diffs, and research citations.
              </p>
            </div>
            <button
              id="export-chat-json-btn"
              type="button"
              onClick={onExportData}
              className="w-full py-1.5 rounded-lg border border-[#D5D0C7] bg-[#FAF8F5] hover:bg-[#F3EFEA] text-xs font-semibold text-[#1F1E1D] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download JSON Archive</span>
            </button>
          </div>

          {/* Wipe Chat History */}
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Wipe Chat History</span>
              </div>
              <p className="text-[11px] text-red-800 mt-1 leading-relaxed">
                Permanently purge all active chat messages and generated diffs from your current workspace.
              </p>
            </div>
            <button
              id="wipe-chat-history-btn"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-1.5 rounded-lg border border-red-300 bg-red-100 hover:bg-red-200 text-xs font-semibold text-red-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-700" />
              <span>Wipe History...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Wipe */}
      {showDeleteConfirm && (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-red-950">
                Are you absolutely sure you want to wipe chat history?
              </h5>
              <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                This action cannot be undone. Type <strong className="font-mono">DELETE</strong> below to confirm.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={deleteInputText}
              onChange={(e) => setDeleteInputText(e.target.value)}
              placeholder="Type DELETE"
              className="px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-mono text-red-950 outline-hidden focus:border-red-500 w-36"
            />
            <button
              type="button"
              disabled={deleteInputText.trim() !== 'DELETE' || isDeleting}
              onClick={handleConfirmClear}
              className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white text-xs font-bold transition-colors"
            >
              {isDeleting ? 'Wiping...' : 'Confirm Wipe'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteInputText('');
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D5D0C7] text-xs font-medium text-[#736E67] hover:text-[#1F1E1D]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
