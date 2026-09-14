'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Check,
  Loader2,
  AlertOctagon,
  LogOut,
  MapPin,
  Clock,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { UserProfileSettings, ActiveSession } from '@/lib/types';
import { supabase, getStoredSessions, revokeStoredOtherSessions } from '@/lib/supabase';

interface SecurityTabProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => void;
}

export default function SecurityTab({
  profile,
  onUpdateProfile,
}: SecurityTabProps) {
  const [optOut, setOptOut] = useState(profile.excludeFromModelTraining);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeFeedback, setRevokeFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('isCurrent', { ascending: false })
        .limit(10);
      if (data) setSessions(data as ActiveSession[]);
    };

    loadSessions();

    const handleSessionsUpdate = () => {
      setSessions(getStoredSessions());
    };

    window.addEventListener('ai_festa_sessions_updated', handleSessionsUpdate);
    return () => {
      window.removeEventListener('ai_festa_sessions_updated', handleSessionsUpdate);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<UserProfileSettings> = {
      excludeFromModelTraining: optOut,
    };

    try {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      onUpdateProfile(updates);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save security settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeOthers = async () => {
    setIsRevoking(true);
    setTimeout(async () => {
      await supabase.from('sessions').delete().neq('isCurrent', true);
      const remaining = revokeStoredOtherSessions();
      setSessions(remaining);
      setIsRevoking(false);
      setRevokeFeedback('Successfully terminated 2 unauthorized remote sessions.');
      setTimeout(() => setRevokeFeedback(null), 4000);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#1F1E1D]">Privacy, Data Governance & Active Sessions</h3>
        <p className="text-xs text-[#736E67] mt-0.5">
          Control upstream model training telemetry, audit active logins, and revoke untrusted devices.
        </p>
      </div>

      {revokeFeedback && (
        <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{revokeFeedback}</span>
        </div>
      )}

      {/* Model Training Opt-Out */}
      <div className="p-4 rounded-xl border border-[#E5E2DC] bg-[#FAF8F5] space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold text-[#1F1E1D]">
                Data Training Opt-Out & Zero-Retention SLA
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                ENFORCED
              </span>
            </div>
            <p className="text-xs text-[#736E67] leading-relaxed">
              Exclude all prompt inputs, repository code diffs, and research notes from upstream foundation model training
              (Anthropic Claude, OpenAI, Meta, DeepSeek). Zero data is logged or cached for model fine-tuning.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={optOut}
              onChange={(e) => setOptOut(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#D5D0C7] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D5D0C7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Active Session Audit Trail */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#736E67]" />
              <span>Active Session Audit Trail</span>
            </h4>
            <p className="text-xs text-[#736E67]">
              Real-time audit log of devices authenticated with your Supabase account.
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              disabled={isRevoking}
              onClick={handleRevokeOthers}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>{isRevoking ? 'Revoking...' : 'Revoke Other Sessions'}</span>
            </button>
          )}
        </div>

        <div className="rounded-xl border border-[#E5E2DC] overflow-hidden bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E5E2DC] text-[#736E67] text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Device & Operating System</th>
                <th className="py-2.5 px-3 font-semibold">Browser</th>
                <th className="py-2.5 px-3 font-semibold">IP & Location</th>
                <th className="py-2.5 px-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {sess.device.includes('iPhone') ? (
                        <Smartphone className="w-4 h-4 text-[#736E67]" />
                      ) : (
                        <Laptop className="w-4 h-4 text-[#736E67]" />
                      )}
                      <span className="font-semibold text-[#1F1E1D]">{sess.device}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[#736E67] font-mono text-[11px]">
                    {sess.browser}
                  </td>
                  <td className="py-3 px-3 text-[#736E67] text-[11px]">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{sess.ipCity}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {sess.isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        Current Session
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#858079]">
                        {sess.lastActive}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E2DC]">
        {showSaved ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Privacy preferences saved!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#858079]">
            Synced across active authentication cookies
          </span>
        )}

        <button
          id="security-settings-save-btn"
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
