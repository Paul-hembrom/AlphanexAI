'use client';

import {
  UserProfileSettings,
  BillingTransaction,
  ActiveSession,
  ChatThread,
  WorkMode,
  ChatMessage,
} from './types';
import { INITIAL_DIFF_SAMPLE } from './constants';

import { createClient as createBrowserClient, isSupabaseConfigured } from './supabase/client';

export { createBrowserClient, isSupabaseConfigured };

export const PROFILE_STORAGE_KEY = 'ai_festa_user_profile_v2';
export const TRANSACTIONS_STORAGE_KEY = 'ai_festa_transactions_v2';
export const SESSIONS_STORAGE_KEY = 'ai_festa_active_sessions_v2';
export const THREADS_STORAGE_KEY = 'ai_festa_chat_threads_v2';

// Static deterministic timestamp baseline to eliminate SSR-client hydration mismatch
const STATIC_REF_TIME = 1757746800000;

export const INITIAL_THREADS: ChatThread[] = [];

export const DEFAULT_PROFILE_TEMPLATE: Omit<UserProfileSettings, 'id' | 'fullName' | 'email' | 'avatarUrl'> = {
  workContext: 'Full-Stack Developer',
  customWorkContextTitle: '',
  institutionOrCompany: '',
  githubUsername: '',
  globalSystemInstruction: 'Act as an elite full-stack engineer and researcher specializing in high-performance TypeScript, Python WASM runtimes, and localized Nepali fintech/academic architectures.',
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
  updatedAt: new Date().toISOString(),
};

export const FALLBACK_GUEST_PROFILE: UserProfileSettings = {
  id: '',
  fullName: 'Guest User',
  email: '',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  ...DEFAULT_PROFILE_TEMPLATE,
};

export const INITIAL_USER_PROFILE = FALLBACK_GUEST_PROFILE;

export const INITIAL_TRANSACTIONS: BillingTransaction[] = [
  {
    id: 'tx_esewa_984120',
    date: '2026-09-12 14:22',
    gateway: 'eSewa',
    amountNpr: 1200,
    creditsAdded: 1500,
    status: 'Completed',
    tierPlan: 'Pro Builder',
    invoiceRef: 'NP-ESW-992014',
  },
  {
    id: 'tx_khalti_773120',
    date: '2026-08-28 09:15',
    gateway: 'Khalti',
    amountNpr: 500,
    creditsAdded: 500,
    status: 'Completed',
    tierPlan: 'Starter',
    invoiceRef: 'NP-KHL-551023',
  },
  {
    id: 'tx_fonepay_110293',
    date: '2026-08-10 18:40',
    gateway: 'Fonepay',
    amountNpr: 2500,
    creditsAdded: 3500,
    status: 'Completed',
    tierPlan: 'Pro Builder',
    invoiceRef: 'NP-FNP-102938',
  },
];

export const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'sess_macbook_current',
    device: 'Apple MacBook Pro 16" (macOS Sonoma)',
    browser: 'Brave / Chrome 128.0',
    ipCity: 'Kathmandu, Nepal (103.10.28.14)',
    lastActive: 'Active Now',
    isCurrent: true,
  },
  {
    id: 'sess_iphone_mobile',
    device: 'Apple iPhone 15 Pro (iOS 18.2)',
    browser: 'Safari Mobile 18.0',
    ipCity: 'Lalitpur, Nepal (202.70.77.102)',
    lastActive: '35 minutes ago',
    isCurrent: false,
  },
  {
    id: 'sess_linux_desktop',
    device: 'Dell Precision (Ubuntu 24.04 LTS)',
    browser: 'Firefox Developer Edition 130.0',
    ipCity: 'Pokhara, Nepal (110.44.112.5)',
    lastActive: '3 days ago',
    isCurrent: false,
  },
];

export function getStoredProfile(): UserProfileSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return null;
}

export function saveStoredProfile(profile: UserProfileSettings | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('ai_festa_profile_updated', { detail: profile }));
  } catch (err) {
    console.error('Failed to save profile locally', err);
  }
}

export function getStoredTransactions(): BillingTransaction[] {
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_TRANSACTIONS;
}

export function addStoredTransaction(tx: Omit<BillingTransaction, 'id' | 'date'>): BillingTransaction {
  const current = getStoredTransactions();
  const newTx: BillingTransaction = {
    ...tx,
    id: `tx_${tx.gateway}_${Date.now()}`,
    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };
  const updated = [newTx, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ai_festa_transactions_updated', { detail: updated }));
    } catch (err) {
      console.error('Failed to store transaction', err);
    }
  }
  return newTx;
}

export function getStoredSessions(): ActiveSession[] {
  if (typeof window === 'undefined') return INITIAL_ACTIVE_SESSIONS;
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_ACTIVE_SESSIONS;
}

export function revokeStoredOtherSessions(): ActiveSession[] {
  const sessions = getStoredSessions();
  const currentOnly = sessions.filter((s) => s.isCurrent);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(currentOnly));
      window.dispatchEvent(new CustomEvent('ai_festa_sessions_updated', { detail: currentOnly }));
    } catch (err) {
      console.error('Failed to revoke sessions', err);
    }
  }
  return currentOnly;
}

/**
 * Thread / Conversation Storage Functions
 */
const DUMMY_THREAD_IDS = new Set(['t-1', 't-2', 't-3', 't-4', 't-5']);

export function getStoredThreads(): ChatThread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(THREADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seen = new Set<string>();
        const deduplicated: ChatThread[] = [];
        let hadDummies = false;

        for (const item of parsed) {
          if (item && item.id && !seen.has(item.id)) {
            if (DUMMY_THREAD_IDS.has(item.id)) {
              hadDummies = true;
              continue;
            }
            seen.add(item.id);
            deduplicated.push(item);
          }
        }

        // Clean up localStorage if dummy chats were present
        if (hadDummies) {
          try {
            localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(deduplicated));
          } catch {}
        }

        return deduplicated;
      }
    }
  } catch (err) {
    console.error('Failed to parse stored threads', err);
  }
  return [];
}

export function saveStoredThreads(threads: ChatThread[]): void {
  if (typeof window === 'undefined') return;
  try {
    const seen = new Set<string>();
    const deduplicated = threads.filter((t) => {
      if (!t || !t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(deduplicated));
    window.dispatchEvent(new CustomEvent('ai_festa_threads_updated', { detail: deduplicated }));
  } catch (err) {
    console.error('Failed to save threads locally', err);
  }
}

export function deleteStoredThread(id: string): ChatThread[] {
  const current = getStoredThreads();
  const updated = current.filter((t) => t.id !== id);
  saveStoredThreads(updated);
  return updated;
}

export function renameStoredThread(id: string, newTitle: string): ChatThread[] {
  const current = getStoredThreads();
  const trimmed = newTitle.trim();
  if (!trimmed) return current;
  const updated = current.map((t) =>
    t.id === id ? { ...t, title: trimmed, updatedAt: Date.now() } : t
  );
  saveStoredThreads(updated);
  return updated;
}

export function togglePinStoredThread(id: string): ChatThread[] {
  const current = getStoredThreads();
  const updated = current.map((t) =>
    t.id === id ? { ...t, isPinned: !t.isPinned, updatedAt: Date.now() } : t
  );
  saveStoredThreads(updated);
  return updated;
}

export function duplicateStoredThread(id: string): {
  threads: ChatThread[];
  duplicated: ChatThread | null;
} {
  const current = getStoredThreads();
  const target = current.find((t) => t.id === id);
  if (!target) return { threads: current, duplicated: null };

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const duplicated: ChatThread = {
    ...target,
    id: `t-${Date.now()}-${randomSuffix}`,
    title: `${target.title} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPinned: false,
    messages: target.messages.map((m) => ({
      ...m,
      id: `${m.id}-copy-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(2, 6)}`,
    })),
  };

  const updated = [duplicated, ...current.filter((t) => t.id !== duplicated.id)];
  saveStoredThreads(updated);
  return { threads: updated, duplicated };
}

export function createStoredThread(
  title: string,
  mode: WorkMode,
  modelId: string,
  initialMessages: ChatMessage[] = []
): ChatThread {
  const current = getStoredThreads();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const newThread: ChatThread = {
    id: `t-${Date.now()}-${randomSuffix}`,
    title: title.trim() || 'Untitled Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode,
    modelId,
    isPinned: false,
    messages: initialMessages,
    snippet: initialMessages[initialMessages.length - 1]?.content.slice(0, 80) || 'New conversation',
  };

  const updated = [newThread, ...current.filter((t) => t.id !== newThread.id)];
  saveStoredThreads(updated);
  return newThread;
}

export function updateStoredThreadMessages(id: string, messages: ChatMessage[]): ChatThread[] {
  const current = getStoredThreads();
  const lastMsg = messages[messages.length - 1];
  const snippet = lastMsg ? lastMsg.content.slice(0, 90).replace(/\n/g, ' ') : '';
  const updated = current.map((t) =>
    t.id === id
      ? {
          ...t,
          messages,
          snippet: snippet || t.snippet,
          updatedAt: Date.now(),
        }
      : t
  );
  saveStoredThreads(updated);
  return updated;
}

export function updateStoredThreadMode(id: string, mode: WorkMode): ChatThread[] {
  const current = getStoredThreads();
  const updated = current.map((t) =>
    t.id === id
      ? {
          ...t,
          mode,
          updatedAt: Date.now(),
        }
      : t
  );
  saveStoredThreads(updated);
  return updated;
}

export function updateStoredThreadModel(id: string, modelId: string): ChatThread[] {
  const current = getStoredThreads();
  const updated = current.map((t) =>
    t.id === id
      ? {
          ...t,
          modelId,
          updatedAt: Date.now(),
        }
      : t
  );
  saveStoredThreads(updated);
  return updated;
}

export function clearAllStoredThreads(): ChatThread[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(THREADS_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('ai_festa_threads_updated', { detail: [] }));
    } catch {}
  }
  return [];
}

/**
 * Resilient Supabase client implementation.
 * Ensures that even in offline, edge, or local sandbox modes without active
 * remote Supabase credentials, all CRUD operations function seamlessly.
 */
class ResilientSupabaseClient {
  from(table: string) {
    return {
      select: (columns = '*') => ({
        eq: (col: string, val: any) => ({
          single: async () => {
            if (table === 'profiles') {
              return { data: getStoredProfile(), error: null };
            }
            return { data: null, error: null };
          },
        }),
        order: (col: string, options?: any) => ({
          limit: async (limitCount: number) => {
            if (table === 'transactions') {
              return { data: getStoredTransactions().slice(0, limitCount), error: null };
            }
            if (table === 'sessions') {
              return { data: getStoredSessions().slice(0, limitCount), error: null };
            }
            return { data: [], error: null };
          },
        }),
      }),

      update: (updates: any) => ({
        eq: async (col: string, val: any) => {
          if (table === 'profiles') {
            const current = getStoredProfile();
            const updated = { ...current, ...updates };
            saveStoredProfile(updated);
            return { data: updated, error: null };
          }
          return { data: updates, error: null };
        },
      }),

      insert: async (records: any | any[]) => {
        if (table === 'transactions') {
          const rec = Array.isArray(records) ? records[0] : records;
          const created = addStoredTransaction(rec);
          return { data: [created], error: null };
        }
        return { data: records, error: null };
      },

      delete: () => ({
        neq: async (col: string, val: any) => {
          if (table === 'sessions' && col === 'isCurrent') {
            const currentOnly = revokeStoredOtherSessions();
            return { data: currentOnly, error: null };
          }
          return { data: [], error: null };
        },
      }),
    };
  }
}

const fallbackClient = new ResilientSupabaseClient();

export const supabase = {
  get auth() {
    if (isSupabaseConfigured()) {
      return createBrowserClient().auth;
    }
    return {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithOAuth: async () => ({ data: null, error: new Error('Supabase is not configured') }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    };
  },
  from(table: string) {
    if (isSupabaseConfigured()) {
      return createBrowserClient().from(table as any);
    }
    return fallbackClient.from(table);
  },
};

