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

export const PROFILE_STORAGE_KEY = 'ai_festa_user_profile_v2';
export const TRANSACTIONS_STORAGE_KEY = 'ai_festa_transactions_v2';
export const SESSIONS_STORAGE_KEY = 'ai_festa_active_sessions_v2';
export const THREADS_STORAGE_KEY = 'ai_festa_chat_threads_v2';

// Static deterministic timestamp baseline to eliminate SSR-client hydration mismatch
const STATIC_REF_TIME = 1757746800000;

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: 't-1',
    title: 'eSewa v2 HMAC-SHA256 Signature Fix',
    createdAt: STATIC_REF_TIME - 1000 * 60 * 15,
    updatedAt: STATIC_REF_TIME - 1000 * 60 * 10,
    mode: 'developer',
    modelId: 'claude-3-7-sonnet',
    isPinned: true,
    snippet: 'EPAY v2 base64 digest and secret key verification',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content:
          'We are getting `INVALID_SIGNATURE` from the eSewa epay v2 UAT sandbox during checkout redirect. Can you review our HMAC-SHA256 generation logic?',
        timestamp: STATIC_REF_TIME - 1000 * 60 * 15,
        mode: 'developer',
        modelId: 'claude-3-7-sonnet',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `I've analyzed your eSewa epay v2 verification code against the official Nepal eSewa Developer Guidelines. The root cause is a parameter ordering mismatch in the signature string and hex vs base64 encoding.

### Issues Identified:
1. **Parameter Sequence**: eSewa v2 strictly requires parameters in the exact format: \`total_amount,transaction_uuid,product_code\`.
2. **Digest Encoding**: Unlike v1 which accepted hex digests, v2 requires a raw binary HMAC digest encoded in **Base64**.
3. **Timing-Safe Verification**: Use \`crypto.timingSafeEqual\` to prevent side-channel timing attacks.

I've generated a clean interactive diff for your review in the Dev Canvas drawer. Click **Open in Canvas** to inspect the live changes and run tests.`,
        timestamp: STATIC_REF_TIME - 1000 * 60 * 10,
        mode: 'developer',
        modelId: 'claude-3-7-sonnet',
        diffData: INITIAL_DIFF_SAMPLE,
      },
    ],
  },
  {
    id: 't-2',
    title: 'Devanagari Unicode Normalizer (ZWJ)',
    createdAt: STATIC_REF_TIME - 1000 * 60 * 120,
    updatedAt: STATIC_REF_TIME - 1000 * 60 * 95,
    mode: 'developer',
    modelId: 'qwen-2.5-coder',
    snippet: 'Python normalizer for zero-width joiners and Chandrabindu',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content:
          'Write a fast Python normalizer for Nepali text datasets that removes orphaned Zero Width Joiners (U+200D) and canonicalizes Chandrabindu vs Anusvara.',
        timestamp: STATIC_REF_TIME - 1000 * 60 * 120,
        mode: 'developer',
        modelId: 'qwen-2.5-coder',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `Here is a production-grade Unicode normalizer tailored for Nepali NLP corpora:

\`\`\`python
import unicodedata
import re

ZWJ = "\\u200D"
ZWNJ = "\\u200C"

def normalize_nepali_text(text: str) -> str:
    # 1. Canonical Unicode normalization (NFC)
    text = unicodedata.normalize("NFC", text)
    
    # 2. Clean invalid zero-width characters not attached to halant
    text = re.sub(r"(?<!\\u094D)[" + ZWJ + ZWNJ + "]", "", text)
    
    # 3. Clean repetitive Chandrabindu (ँ) / Anusvara (ं)
    text = re.sub(r"[\\u0901\\u0902]+", "\\u0902", text)
    
    return text.strip()
\`\`\`
This achieves zero regressions on the Nepali Sentiment Corpus benchmarks.`,
        timestamp: STATIC_REF_TIME - 1000 * 60 * 95,
        mode: 'developer',
        modelId: 'qwen-2.5-coder',
      },
    ],
  },
  {
    id: 't-3',
    title: 'Nepal AI Policy & NREN 2026 Analysis',
    createdAt: STATIC_REF_TIME - 1000 * 60 * 60 * 24,
    updatedAt: STATIC_REF_TIME - 1000 * 60 * 60 * 20,
    mode: 'researcher',
    modelId: 'claude-3-7-sonnet',
    isPinned: true,
    snippet: 'MoCIT strategic framework & National Data Center status',
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content:
          'Summarize the key recommendations of the MoCIT Nepal National AI Strategy Draft and high-speed research networking via NREN.',
        timestamp: STATIC_REF_TIME - 1000 * 60 * 60 * 24,
        mode: 'researcher',
        modelId: 'claude-3-7-sonnet',
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: `### Strategic Assessment: Nepal AI Policy Framework (2026)

Based on documentation from the **Ministry of Communication and Information Technology (MoCIT)** and the **Nepal Research and Education Network (NREN)**:

1. **National Sovereign Compute Cluster**:
   - Recommendation to allocate a dedicated GPU acceleration pod inside the Government Integrated Data Center (GIDC) in Singha Durbar and Hetauda Disaster Recovery site.
2. **Open Nepali Linguistic Datasets**:
   - Mandating open access to digitized government archives for Nepali language model training.
3. **Academic Connectivity via NREN**:
   - 10Gbps interconnect between IOE Pulchowk, Kathmandu University, and NAST to support decentralized model inference.`,
        timestamp: STATIC_REF_TIME - 1000 * 60 * 60 * 20,
        mode: 'researcher',
        modelId: 'claude-3-7-sonnet',
        citations: [
          {
            id: 'c-1',
            title: 'MoCIT Draft National Strategy on AI & Emerging Tech',
            url: 'https://mocit.gov.np',
            snippet: 'Strategic priorities for artificial intelligence infrastructure and capacity building in Nepal.',
            source: 'MoCIT Official Gazette',
            reliability: 'high',
          },
          {
            id: 'c-2',
            title: 'NREN High-Performance Computing Research Grid',
            url: 'https://nren.net.np',
            snippet: 'Nepal Research and Education Network gigabit peering and campus research clusters.',
            source: 'NREN Technical Paper',
            reliability: 'high',
          },
        ],
      },
    ],
  },
  {
    id: 't-4',
    title: 'NRB Digital Wallet vs QR Volume FY26',
    createdAt: STATIC_REF_TIME - 1000 * 60 * 60 * 72,
    updatedAt: STATIC_REF_TIME - 1000 * 60 * 60 * 70,
    mode: 'researcher',
    modelId: 'deepseek-r1',
    snippet: 'Nepal Rastra Bank indicators: Fonepay, eSewa, Khalti',
    messages: [
      {
        id: 'msg-7',
        role: 'user',
        content: 'What are the latest QR vs digital wallet transaction volumes reported by Nepal Rastra Bank?',
        timestamp: STATIC_REF_TIME - 1000 * 60 * 60 * 72,
        mode: 'researcher',
        modelId: 'deepseek-r1',
      },
      {
        id: 'msg-8',
        role: 'assistant',
        content: `According to the latest **Nepal Rastra Bank (NRB) Payment Systems Indicators**:

* **QR Code Transactions (Fonepay, NepalPay, SmartQR)**: Exceeded **NPR 45.2 Billion** monthly, representing a 68% year-over-year growth.
* **Digital Wallets (eSewa, Khalti, IME Pay)**: Wallet transaction count reached **28.4 Million** monthly transactions.
* **Key Insight**: Interoperable QR transactions have surpassed peer-to-peer wallet transfers for merchant retail payments in urban centers like Kathmandu and Pokhara.`,
        timestamp: STATIC_REF_TIME - 1000 * 60 * 60 * 70,
        mode: 'researcher',
        modelId: 'deepseek-r1',
      },
    ],
  },
  {
    id: 't-5',
    title: 'Kathmandu AgriTech Pitch Deck Draft',
    createdAt: STATIC_REF_TIME - 1000 * 60 * 60 * 120,
    updatedAt: STATIC_REF_TIME - 1000 * 60 * 60 * 118,
    mode: 'general',
    modelId: 'gemini-2.5-flash',
    snippet: 'Mustang apple supply chain wholesale logistics pitch',
    messages: [
      {
        id: 'msg-9',
        role: 'user',
        content: 'Draft a 5-slide outline for an AgriTech startup connecting Mustang apple farmers with Kathmandu wholesale grocers.',
        timestamp: STATIC_REF_TIME - 1000 * 60 * 60 * 120,
        mode: 'general',
        modelId: 'gemini-2.5-flash',
      },
      {
        id: 'msg-10',
        role: 'assistant',
        content: `Here is a high-impact 5-slide pitch structure tailored for Himalayan AgriTech:

1. **Slide 1: Problem** — 35% post-harvest spoilage along Beni-Jomsom highway and middleman commission markups.
2. **Slide 2: Solution** — Temperature-monitored cold chain booking and digital escrow settlement via eSewa/Khalti.
3. **Slide 3: Market Size** — $42M annual apple and temperate fruit consumption in the Kathmandu valley.
4. **Slide 4: Traction & Pilot** — 14 farmer cooperatives in Marpha and Kagbeni onboarded.
5. **Slide 5: The Ask** — Seeking NPR 1.5 Crore seed round for refrigerated transit hubs in Pokhara.`,
        timestamp: STATIC_REF_TIME - 1000 * 60 * 60 * 118,
        mode: 'general',
        modelId: 'gemini-2.5-flash',
      },
    ],
  },
];

export const INITIAL_USER_PROFILE: UserProfileSettings = {
  id: 'usr_nepal_builder_001',
  fullName: 'Paul Hembrom',
  email: 'paul.hembrom@aifesta.np',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  workContext: 'dev',
  customWorkContextTitle: '',
  institutionOrCompany: 'Tribhuvan University / IOE Pulchowk',
  githubUsername: 'paulhembrom-np',
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
  updatedAt: '2026-09-13T07:00:00.000Z',
};

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

export function getStoredProfile(): UserProfileSettings {
  if (typeof window === 'undefined') return INITIAL_USER_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return { ...INITIAL_USER_PROFILE, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return INITIAL_USER_PROFILE;
}

export function saveStoredProfile(profile: UserProfileSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
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
export function getStoredThreads(): ChatThread[] {
  if (typeof window === 'undefined') return INITIAL_THREADS;
  try {
    const raw = localStorage.getItem(THREADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seen = new Set<string>();
        const deduplicated: ChatThread[] = [];
        for (const item of parsed) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            deduplicated.push(item);
          }
        }
        return deduplicated.length > 0 ? deduplicated : INITIAL_THREADS;
      }
    }
  } catch (err) {
    console.error('Failed to parse stored threads', err);
  }
  return INITIAL_THREADS;
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

export const supabase = new ResilientSupabaseClient();
