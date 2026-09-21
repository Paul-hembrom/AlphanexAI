'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from './client';
import { UserProfileSettings } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => isSupabaseConfigured());

  const fetchProfile = useCallback(async (activeUser: User) => {
    try {
      if (!isSupabaseConfigured()) {
        return null;
      }
      const supabase = createClient();
      const { data: profileRow, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[useAuth] Could not fetch profile row:', error.message);
      }

      const meta = activeUser.user_metadata || {};
      const derivedFullName =
        profileRow?.full_name ||
        meta.full_name ||
        meta.name ||
        activeUser.email?.split('@')[0] ||
        'Anonymous Builder';

      const derivedAvatar =
        profileRow?.avatar_url ||
        meta.avatar_url ||
        meta.picture ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      const fullProfile: UserProfileSettings = {
        id: activeUser.id,
        fullName: derivedFullName,
        email: activeUser.email || '',
        avatarUrl: derivedAvatar,
        workContext: (profileRow?.work_context as any) || 'Full-Stack Developer',
        customWorkContextTitle: '',
        institutionOrCompany: profileRow?.institution_or_company || '',
        githubUsername: profileRow?.github_username || meta.user_name || '',
        globalSystemInstruction:
          'Act as an elite full-stack engineer and researcher specializing in high-performance TypeScript, Python WASM runtimes, and localized Nepali fintech/academic architectures.',
        nepaliTonePreference: 'formal_english_nepali_nuance',
        outputLanguageTone: 'Bilingual (English with Nepali explanations)',
        codeExecutionEngine: 'pyodide_wasm',
        sandboxNetworkAccess: false,
        searchProvider: 'tavily',
        nepaliGroundingBias: true,
        citationDensity: 'inline_brackets',
        theme: 'warm_stone',
        typography: 'inter',
        autoOpenDiffOnLargeChanges: true,
        displayInlineRunCodeButton: true,
        excludeFromModelTraining: true,
        updatedAt: profileRow?.updated_at || new Date().toISOString(),
      };

      setProfile(fullProfile);
      return fullProfile;
    } catch (err) {
      console.error('[useAuth] Failed to load profile:', err);
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        await fetchProfile(currentSession.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('[useAuth] Error refreshing session:', err);
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();

    // Initial session retrieval
    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
        if (!isMounted) return;
        setSession(currentSession);
        if (currentSession?.user) {
          setUser(currentSession.user);
          await fetchProfile(currentSession.user);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[useAuth] Error fetching initial session:', err);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        await fetchProfile(newSession.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Listen for postMessage from OAuth popup callback
    const handlePopupMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        const {
          data: { session: popupSession },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(popupSession);
        if (popupSession?.user) {
          setUser(popupSession.user);
          await fetchProfile(popupSession.user);
        }
      }
    };
    window.addEventListener('message', handlePopupMessage);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('message', handlePopupMessage);
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[useAuth] Error signing out:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return {
    user,
    session,
    profile,
    isLoading,
    refreshSession,
    signOut,
    isConfigured: isSupabaseConfigured(),
  };
}
