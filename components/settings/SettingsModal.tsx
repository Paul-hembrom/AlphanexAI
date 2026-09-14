'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  User,
  CreditCard,
  Sliders,
  Code2,
  Globe,
  Palette,
  ShieldCheck,
  Command,
  Check,
} from 'lucide-react';
import { UserProfileSettings, UserWallet } from '@/lib/types';
import ProfileTab from './tabs/ProfileTab';
import BillingUsageTab from './tabs/BillingUsageTab';
import CustomInstructionsTab from './tabs/CustomInstructionsTab';
import DeveloperTab from './tabs/DeveloperTab';
import ResearcherTab from './tabs/ResearcherTab';
import AppearanceTab from './tabs/AppearanceTab';
import SecurityTab from './tabs/SecurityTab';

export type SettingsTabId =
  | 'profile'
  | 'billing'
  | 'instructions'
  | 'developer'
  | 'researcher'
  | 'appearance'
  | 'security';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
  wallet: UserWallet;
  onTopUpSuccess: (addedCredits: number, newPlan?: 'Starter' | 'Pro Builder') => void;
  onExportData: () => void;
  onClearHistory: () => void;
  initialTab?: SettingsTabId;
}

const TABS: { id: SettingsTabId; label: string; icon: any; category: string }[] = [
  { id: 'profile', label: 'Profile & Work Context', icon: User, category: 'Account & Identity' },
  { id: 'billing', label: 'Subscription & Credits', icon: CreditCard, category: 'Billing & Usage' },
  { id: 'instructions', label: 'Custom Instructions', icon: Sliders, category: 'System Personality' },
  { id: 'developer', label: 'Developer & Runtime', icon: Code2, category: 'Developer Mode' },
  { id: 'researcher', label: 'Researcher & Grounding', icon: Globe, category: 'Researcher Mode' },
  { id: 'appearance', label: 'Artifacts & Workspace', icon: Palette, category: 'Appearance & UI' },
  { id: 'security', label: 'Privacy & Active Sessions', icon: ShieldCheck, category: 'Security & Auditing' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  wallet,
  onTopUpSuccess,
  onExportData,
  onClearHistory,
  initialTab = 'profile',
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync initial tab if opened directly with specific tab
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Keyboard shortcut listener: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div
        ref={modalRef}
        id="settings-modal-container"
        className="w-full max-w-4xl h-[90vh] max-h-[700px] flex flex-col md:flex-row bg-[#FBF9F5] rounded-2xl border border-[#E5E2DC] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Left Navigation Rail */}
        <aside
          id="settings-nav-rail"
          className="w-full md:w-64 bg-[#FAF8F5] border-b md:border-b-0 md:border-r border-[#E5E2DC] flex flex-col justify-between shrink-0"
        >
          {/* Rail Header */}
          <div className="p-4 border-b border-[#EAE6DF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1F1E1D] text-white flex items-center justify-center font-bold text-xs">
                F
              </div>
              <div>
                <h2 id="settings-dialog-title" className="text-xs font-bold text-[#1F1E1D] tracking-tight">
                  Settings & Preferences
                </h2>
                <span className="text-[10px] text-[#858079] block">AI Festa Studio Nepal</span>
              </div>
            </div>

            {/* Mobile close button inside header */}
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-[#EAE6DF] text-[#736E67] hover:text-[#1F1E1D]"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1 overflow-y-auto flex-1 max-h-[30vh] md:max-h-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-btn-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1F1E1D] text-white shadow-xs font-semibold'
                      : 'text-[#55504A] hover:bg-[#EFECE6] hover:text-[#1F1E1D]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#736E67]'
                    }`}
                  />
                  <div className="flex-1 truncate">
                    <span className="block truncate">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Bottom user status chip in left rail */}
          <div className="p-3 border-t border-[#EAE6DF] bg-[#F5F2EC] flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Image
                src={profile.avatarUrl}
                alt={profile.fullName}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover border border-white shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="truncate text-left">
                <span className="text-xs font-bold text-[#1F1E1D] block truncate">
                  {profile.fullName}
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold block truncate">
                  {wallet.plan} ({wallet.credits} Cr)
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono text-[#858079] bg-white px-1.5 py-0.5 rounded border border-[#E5E2DC]">
              ESC
            </span>
          </div>
        </aside>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FBF9F5]">
          {/* Top Bar for Right Panel */}
          <div className="p-3.5 px-6 border-b border-[#E5E2DC] flex items-center justify-between bg-white/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#858079] uppercase tracking-wider font-semibold">
                {TABS.find((t) => t.id === activeTab)?.category}
              </span>
              <span className="text-xs text-[#D5D0C7]">/</span>
              <span className="text-xs font-bold text-[#1F1E1D]">
                {TABS.find((t) => t.id === activeTab)?.label}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#858079]">
                <kbd className="px-1.5 py-0.5 rounded border border-[#D5D0C7] bg-[#FAF8F5] font-mono text-[10px]">
                  Cmd
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded border border-[#D5D0C7] bg-[#FAF8F5] font-mono text-[10px]">
                  ,
                </kbd>
              </div>

              <button
                id="close-settings-modal-btn"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#EAE6DF] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                title="Close settings (Escape)"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Granular Tab Content View */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                onUpdateProfile={onUpdateProfile}
                onExportData={onExportData}
                onClearHistory={onClearHistory}
              />
            )}

            {activeTab === 'billing' && (
              <BillingUsageTab
                wallet={wallet}
                onTopUpSuccess={onTopUpSuccess}
              />
            )}

            {activeTab === 'instructions' && (
              <CustomInstructionsTab
                profile={profile}
                onUpdateProfile={onUpdateProfile}
              />
            )}

            {activeTab === 'developer' && (
              <DeveloperTab
                profile={profile}
                onUpdateProfile={onUpdateProfile}
              />
            )}

            {activeTab === 'researcher' && (
              <ResearcherTab
                profile={profile}
                onUpdateProfile={onUpdateProfile}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceTab
                profile={profile}
                onUpdateProfile={onUpdateProfile}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab
                profile={profile}
                onUpdateProfile={onUpdateProfile}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
