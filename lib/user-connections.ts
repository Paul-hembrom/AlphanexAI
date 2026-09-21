import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken } from './crypto';

export interface UserConnection {
  id?: string;
  userId: string;
  provider: 'github' | 'google';
  accessToken: string; // Plaintext in runtime memory
  refreshToken?: string | null;
  scopes?: string;
  expiresAt?: number | null;
  connectedAt: string;
  updatedAt?: string;
  accountUsername?: string;
  accountEmail?: string;
}

interface StoredEncryptedRecord {
  id: string;
  user_id: string;
  provider: 'github' | 'google';
  access_token: string; // AES-256-GCM encrypted
  refresh_token?: string | null; // AES-256-GCM encrypted
  scopes?: string;
  expires_at?: number | null;
  connected_at: string;
  updated_at: string;
  account_username?: string;
  account_email?: string;
}

// ---------------------------------------------------------------------------
// Supabase Client Initialization (Server-side)
// ---------------------------------------------------------------------------
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false },
      });
      return supabaseClient;
    } catch (e) {
      console.warn('[user-connections] Could not initialize Supabase client:', e);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resilient File Store (Persistent on container disk)
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'user_connections.json');

function readLocalEncryptedStore(): StoredEncryptedRecord[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) || [];
  } catch (err) {
    console.warn('[user-connections] Error reading local store:', err);
    return [];
  }
}

function writeLocalEncryptedStore(records: StoredEncryptedRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('[user-connections] Error writing to local store:', err);
  }
}

// ---------------------------------------------------------------------------
// Core DB / Store Operations
// ---------------------------------------------------------------------------

export async function getUserConnection(
  userId: string,
  provider: 'github' | 'google'
): Promise<UserConnection | null> {
  const sb = getSupabaseClient();

  // 1. Try Supabase first if available
  if (sb) {
    try {
      const { data, error } = await sb
        .from('user_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          provider: data.provider,
          accessToken: decryptToken(data.access_token),
          refreshToken: data.refresh_token ? decryptToken(data.refresh_token) : null,
          scopes: data.scopes,
          expiresAt: data.expires_at ? Number(data.expires_at) : null,
          connectedAt: data.connected_at,
          updatedAt: data.updated_at,
          accountUsername: data.account_username,
          accountEmail: data.account_email,
        };
      }
    } catch (e) {
      console.warn('[user-connections] Supabase fetch error, checking local store:', e);
    }
  }

  // 2. Fallback to resilient encrypted local store
  const localRecords = readLocalEncryptedStore();
  const match = localRecords.find((r) => r.user_id === userId && r.provider === provider);
  if (match) {
    return {
      id: match.id,
      userId: match.user_id,
      provider: match.provider,
      accessToken: decryptToken(match.access_token),
      refreshToken: match.refresh_token ? decryptToken(match.refresh_token) : null,
      scopes: match.scopes,
      expiresAt: match.expires_at ? Number(match.expires_at) : null,
      connectedAt: match.connected_at,
      updatedAt: match.updated_at,
      accountUsername: match.account_username,
      accountEmail: match.account_email,
    };
  }

  return null;
}

export async function upsertUserConnection(
  conn: Omit<UserConnection, 'connectedAt'> & { connectedAt?: string }
): Promise<UserConnection> {
  const now = new Date().toISOString();
  const connectedAt = conn.connectedAt || now;
  const updatedAt = now;

  const encryptedRecord: StoredEncryptedRecord = {
    id: conn.id || `conn_${conn.provider}_${conn.userId}`,
    user_id: conn.userId,
    provider: conn.provider,
    access_token: encryptToken(conn.accessToken),
    refresh_token: conn.refreshToken ? encryptToken(conn.refreshToken) : null,
    scopes: conn.scopes,
    expires_at: conn.expiresAt || null,
    connected_at: connectedAt,
    updated_at: updatedAt,
    account_username: conn.accountUsername,
    account_email: conn.accountEmail,
  };

  // 1. Persist to local store for offline resilience
  const localRecords = readLocalEncryptedStore();
  const existingIdx = localRecords.findIndex(
    (r) => r.user_id === conn.userId && r.provider === conn.provider
  );
  if (existingIdx >= 0) {
    localRecords[existingIdx] = {
      ...localRecords[existingIdx],
      ...encryptedRecord,
      id: localRecords[existingIdx].id,
      connected_at: localRecords[existingIdx].connected_at || connectedAt,
    };
  } else {
    localRecords.push(encryptedRecord);
  }
  writeLocalEncryptedStore(localRecords);

  // 2. Upsert to Supabase if available
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { error } = await sb.from('user_connections').upsert(
        {
          user_id: conn.userId,
          provider: conn.provider,
          access_token: encryptedRecord.access_token,
          refresh_token: encryptedRecord.refresh_token,
          scopes: conn.scopes,
          expires_at: conn.expiresAt || null,
          connected_at: connectedAt,
          updated_at: updatedAt,
          account_username: conn.accountUsername,
          account_email: conn.accountEmail,
        },
        { onConflict: 'user_id,provider' }
      );
      if (error) {
        console.warn('[user-connections] Supabase upsert note:', error.message);
      }
    } catch (e) {
      console.warn('[user-connections] Supabase upsert exception:', e);
    }
  }

  return {
    ...conn,
    connectedAt,
    updatedAt,
  };
}

export async function deleteUserConnection(
  userId: string,
  provider: 'github' | 'google'
): Promise<boolean> {
  // 1. Remove from local store
  const localRecords = readLocalEncryptedStore();
  const filtered = localRecords.filter(
    (r) => !(r.user_id === userId && r.provider === provider)
  );
  writeLocalEncryptedStore(filtered);

  // 2. Remove from Supabase
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb
        .from('user_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);
    } catch (e) {
      console.warn('[user-connections] Supabase delete note:', e);
    }
  }

  return true;
}

export async function getUserConnectionsStatus(userId: string) {
  const github = await getUserConnection(userId, 'github');
  const google = await getUserConnection(userId, 'google');

  return {
    github: {
      connected: !!github && !!github.accessToken,
      connectedAt: github?.connectedAt || null,
      username: github?.accountUsername || null,
      scopes: github?.scopes || null,
      source: github ? 'user_oauth' : process.env.GITHUB_TOKEN ? 'env_token' : 'none',
    },
    google: {
      connected: !!google && !!google.accessToken,
      connectedAt: google?.connectedAt || null,
      email: google?.accountEmail || null,
      scopes: google?.scopes || null,
      source: google
        ? 'user_oauth'
        : process.env.GMAIL_MCP_TOKEN || process.env.GDOCS_MCP_TOKEN
        ? 'env_token'
        : 'none',
    },
    hasCredentials: {
      github: !!(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET),
      google: !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    },
  };
}

// ---------------------------------------------------------------------------
// Per-User Token Resolvers (with proactive refresh for Google)
// ---------------------------------------------------------------------------

export async function getValidGitHubToken(userId: string): Promise<string | null> {
  const conn = await getUserConnection(userId, 'github');
  if (conn && conn.accessToken) {
    return conn.accessToken;
  }
  // Admin/testing fallback only
  return process.env.GITHUB_TOKEN || null;
}

export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const conn = await getUserConnection(userId, 'google');

  if (conn && conn.accessToken) {
    // Check if token expires within 2 minutes (120,000 ms)
    const isExpired = conn.expiresAt && conn.expiresAt < Date.now() + 120 * 1000;

    if (isExpired && conn.refreshToken) {
      console.log(`[user-connections] Google token for user ${userId} expired or expiring soon, refreshing...`);
      const refreshedToken = await refreshGoogleAccessToken(userId, conn.refreshToken, conn.scopes);
      if (refreshedToken) {
        return refreshedToken;
      }
    }
    return conn.accessToken;
  }

  // Admin / testing fallback only
  return process.env.GMAIL_MCP_TOKEN || process.env.GDOCS_MCP_TOKEN || null;
}

async function refreshGoogleAccessToken(
  userId: string,
  refreshToken: string,
  existingScopes?: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('[user-connections] Cannot refresh Google token: OAuth credentials missing in environment.');
    return null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[user-connections] Google token refresh failed:', res.status, errBody);
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const newExpiresAt = Date.now() + expiresIn * 1000;

    // Preserve connection while updating the access token and expiration
    const existing = await getUserConnection(userId, 'google');
    await upsertUserConnection({
      userId,
      provider: 'google',
      accessToken: newAccessToken,
      refreshToken: data.refresh_token || refreshToken, // Google might send a new one or keep existing
      scopes: data.scope || existingScopes || existing?.scopes,
      expiresAt: newExpiresAt,
      connectedAt: existing?.connectedAt,
      accountEmail: existing?.accountEmail,
    });

    console.log(`[user-connections] Successfully refreshed Google token for user ${userId}. Expires in ${expiresIn}s.`);
    return newAccessToken;
  } catch (err) {
    console.error('[user-connections] Exception while refreshing Google token:', err);
    return null;
  }
}
