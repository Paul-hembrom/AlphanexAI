'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Github,
  Mail,
  FileText,
  Database,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Key,
  Info,
  ChevronDown,
  ChevronUp,
  LogOut,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { getStoredProfile } from '@/lib/supabase';

interface UserOAuthStatus {
  connected: boolean;
  connectedAt?: string | null;
  username?: string | null;
  email?: string | null;
  scopes?: string | null;
  source?: 'user_oauth' | 'env_token' | 'none';
}

interface OAuthStatusResponse {
  github: UserOAuthStatus;
  google: UserOAuthStatus;
  hasCredentials: {
    github: boolean;
    google: boolean;
  };
}

interface MCPToolInfo {
  name: string;
  desc: string;
}

interface CustomConnectorConfig {
  id: string;
  name: string;
  endpointUrl: string;
  enabled: boolean;
  tools: MCPToolInfo[];
}

export default function ConnectorsTab() {
  const [userId, setUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const profile = getStoredProfile();
        if (profile?.id) return profile.id;
      } catch {
        // Fallback
      }
    }
    return '';
  });
  const [oauthStatus, setOauthStatus] = useState<OAuthStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<'github' | 'google' | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<'github' | 'google' | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authResult = params.get('auth');
      const provider = params.get('provider');
      if (authResult === 'success') {
        return {
          id: provider || 'general',
          success: true,
          message: `Successfully connected ${provider === 'github' ? 'GitHub' : 'Google Workspace'} account!`,
        };
      }
    }
    return null;
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Custom MCP servers for power users
  const [customConnectors, setCustomConnectors] = useState<CustomConnectorConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ai_festa_custom_mcp_servers');
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return [];
  });
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customAuthToken, setCustomAuthToken] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const checkProfile = () => {
      const prof = getStoredProfile();
      if (prof?.id && prof.id !== userId) {
        setUserId(prof.id);
      }
    };
    checkProfile();
    window.addEventListener('ai_festa_profile_updated', checkProfile);
    return () => window.removeEventListener('ai_festa_profile_updated', checkProfile);
  }, [userId]);

  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      if (!userId) {
        setIsLoadingStatus(false);
        return;
      }
      try {
        const res = await fetch(`/api/auth/status?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success && data.connections) {
            setOauthStatus(data.connections);
          }
        }
      } catch (e) {
        console.warn('[ConnectorsTab] Failed to fetch OAuth status:', e);
      } finally {
        if (!ignore) {
          setIsLoadingStatus(false);
        }
      }
    }

    loadStatus();

    // Listen for popup messages
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        const provider = event.data.provider;
        setConnectingProvider(null);
        setTestResult({
          id: provider,
          success: true,
          message: event.data.message || `${provider} connected successfully!`,
        });
        setRefreshKey((k) => k + 1);
      } else if (event.data && event.data.type === 'OAUTH_AUTH_FAILURE') {
        setConnectingProvider(null);
        setTestResult({
          id: event.data.provider || 'general',
          success: false,
          message: event.data.message || 'Authorization failed. Please try again.',
        });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => {
      ignore = true;
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [userId, refreshKey]);

  // Handle Real OAuth Connect
  const handleConnect = async (provider: 'github' | 'google') => {
    setConnectingProvider(provider);
    setTestResult(null);

    const startUrl = `/api/auth/${provider}/start?userId=${encodeURIComponent(userId)}`;

    // Calculate center popup position
    const width = 600;
    const height = 700;
    const left = typeof window !== 'undefined' ? window.screen.width / 2 - width / 2 : 100;
    const top = typeof window !== 'undefined' ? window.screen.height / 2 - height / 2 : 100;

    try {
      const popup = window.open(
        startUrl,
        `${provider}_oauth_popup`,
        `width=${width},height=${height},top=${top},left=${left},status=yes,scrollbars=yes`
      );

      // If popup blocker intervened, fall back to top-level navigation
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = startUrl;
      }
    } catch {
      window.location.href = startUrl;
    }
  };

  // Handle Real OAuth Disconnect
  const handleDisconnect = async (provider: 'github' | 'google') => {
    setDisconnectingProvider(provider);
    setTestResult(null);
    try {
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, userId }),
      });
      if (res.ok) {
        setTestResult({
          id: provider,
          success: true,
          message: `Disconnected ${provider === 'github' ? 'GitHub' : 'Google Workspace'}.`,
        });
        setRefreshKey((k) => k + 1);
      }
    } catch (err: any) {
      setTestResult({
        id: provider,
        success: false,
        message: `Disconnect failed: ${err?.message || err}`,
      });
    } finally {
      setDisconnectingProvider(null);
    }
  };

  // Real Integration Handshake Test
  const handleTestConnection = async (target: 'github' | 'google-docs' | 'gmail' | string) => {
    setTestingId(target);
    setTestResult(null);

    try {
      let endpoint = '/api/integrations/github';
      let payload: Record<string, unknown> = { action: 'list_repos', userId };

      if (target === 'github') {
        endpoint = '/api/integrations/github';
        payload = { action: 'list_repos', userId };
      } else if (target === 'google-docs') {
        endpoint = '/api/integrations/google-docs';
        payload = { action: 'list_documents', userId };
      } else if (target === 'gmail') {
        endpoint = '/api/integrations/gmail';
        payload = { action: 'list_threads', query: 'is:unread', userId };
      } else {
        // Custom MCP
        endpoint = '/api/mcp/execute';
        payload = { server: target, tool: `${target}_ping`, userId };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const tokenLabel = data.tokenSource ? ` [via ${data.tokenSource}]` : '';
        setTestResult({
          id: target,
          success: true,
          message: `${data.message}${tokenLabel}`,
        });
      } else {
        setTestResult({
          id: target,
          success: false,
          message: data.error || data.message || 'Handshake failed',
        });
      }
    } catch (e: any) {
      setTestResult({
        id: target,
        success: false,
        message: `Handshake network error: ${e?.message || e}`,
      });
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    const newId = `custom-${Date.now()}`;
    const newConnector: CustomConnectorConfig = {
      id: newId,
      name: customName.trim(),
      endpointUrl: customUrl.trim(),
      enabled: true,
      tools: [
        { name: `${customName.toLowerCase().replace(/\s+/g, '_')}_query`, desc: 'Remote query execution' },
        { name: `${customName.toLowerCase().replace(/\s+/g, '_')}_fetch`, desc: 'Fetch entity details' },
      ],
    };

    const updated = [...customConnectors, newConnector];
    setCustomConnectors(updated);
    try {
      localStorage.setItem('ai_festa_custom_mcp_servers', JSON.stringify(updated));
    } catch {}

    setCustomName('');
    setCustomUrl('');
    setCustomAuthToken('');
    setShowAddCustom(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customConnectors.filter((c) => c.id !== id);
    setCustomConnectors(updated);
    try {
      localStorage.setItem('ai_festa_custom_mcp_servers', JSON.stringify(updated));
    } catch {}
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://<your-app-domain>';
  const githubCallbackUrl = `${currentOrigin}/api/auth/github/callback`;
  const googleCallbackUrl = `${currentOrigin}/api/auth/google/callback`;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-600" />
            Connected Accounts & MCP Integrations
          </h3>
          <span className="text-[11px] font-mono text-[#736E67] bg-[#F4F1EA] px-2 py-0.5 rounded border border-[#E5E2DC]">
            User: {userId}
          </span>
        </div>
        <p className="text-xs text-[#736E67] mt-1 leading-relaxed">
          Authenticate directly with external providers via standard OAuth 2.0. Each user receives their own isolated, AES-256-GCM encrypted tokens stored in the database.
        </p>
      </div>

      {/* Security & Token Storage Banner */}
      <div className="p-3.5 bg-[#FAF8F5] border border-[#E5E2DC] rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 text-[#55504A]">
          <p className="font-semibold text-[#1F1E1D]">Per-User Encrypted Storage & CSRF Guardrails</p>
          <p className="text-[11px] text-[#736E67] leading-relaxed">
            OAuth tokens are bound to your user record in <code className="text-[#1F1E1D] font-mono bg-[#EFECE6] px-1 py-0.5 rounded">user_connections</code> and encrypted at rest. Tokens are never exposed in client bundles or network logs. Google tokens auto-refresh in the background.
          </p>
        </div>
      </div>

      {/* Primary OAuth Connectors */}
      <div className="space-y-4">
        {/* 1. GITHUB OAUTH CARD */}
        <div
          id="github-oauth-card"
          className="p-4 rounded-xl border bg-white border-[#D5D0C7] shadow-xs space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1F1E1D] text-white flex items-center justify-center shrink-0">
                <Github className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#1F1E1D]">GitHub</span>
                  {oauthStatus?.github.connected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected {oauthStatus.github.username ? `@${oauthStatus.github.username}` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F4F1EA] text-[#736E67] border border-[#E5E2DC]">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#736E67] mt-0.5 leading-snug">
                  Authorize repository search, live file retrieval, branch staging, and direct pull request generation.
                </p>
                {oauthStatus?.github.connected && oauthStatus.github.connectedAt && (
                  <p className="text-[10px] text-[#858079] mt-1 font-mono">
                    Authorized on: {new Date(oauthStatus.github.connectedAt).toLocaleDateString()} · Scopes:{' '}
                    {oauthStatus.github.scopes || 'repo, read:user'}
                  </p>
                )}
              </div>
            </div>

            {/* Action Button: Connect vs Disconnect */}
            <div className="shrink-0 flex items-center gap-2">
              {oauthStatus?.github.connected ? (
                <button
                  type="button"
                  id="disconnect-github-btn"
                  disabled={disconnectingProvider === 'github'}
                  onClick={() => handleDisconnect('github')}
                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{disconnectingProvider === 'github' ? 'Disconnecting...' : 'Disconnect'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="connect-github-btn"
                  disabled={connectingProvider === 'github' || isLoadingStatus}
                  onClick={() => handleConnect('github')}
                  className="px-4 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#33312E] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>{connectingProvider === 'github' ? 'Opening GitHub...' : 'Connect GitHub'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tool tags */}
          <div className="pt-2 border-t border-[#E5E2DC]/80">
            <span className="text-[10px] uppercase font-semibold text-[#858079] tracking-wider block mb-1.5">
              Available GitHub MCP Tools:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'github_search_code', desc: 'Search source code' },
                { name: 'github_list_repos', desc: 'Inspect accessible repositories' },
                { name: 'github_get_file_contents', desc: 'Fetch exact file contents' },
                { name: 'github_create_pull_request', desc: 'Stage commits & open real PR' },
              ].map((t) => (
                <span
                  key={t.name}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F1EA] text-[#3D3A37] border border-[#E5E2DC]"
                  title={t.desc}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Test Action */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E2DC]/50 text-xs">
            <button
              type="button"
              id="test-github-handshake-btn"
              disabled={testingId === 'github'}
              onClick={() => handleTestConnection('github')}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingId === 'github' ? 'animate-spin' : ''}`} />
              <span>{testingId === 'github' ? 'Verifying with GitHub REST API...' : 'Test GitHub Handshake'}</span>
            </button>

            {testResult?.id === 'github' && (
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  testResult.success ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        {/* 2. GOOGLE WORKSPACE OAUTH CARD (GMAIL + GOOGLE DOCS) */}
        <div
          id="google-oauth-card"
          className="p-4 rounded-xl border bg-white border-[#D5D0C7] shadow-xs space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <div className="flex -space-x-1">
                  <Mail className="w-4 h-4 text-red-500" />
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#1F1E1D]">Google Workspace</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-800 border border-blue-100">
                    Gmail + Google Docs
                  </span>
                  {oauthStatus?.google.connected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected {oauthStatus.google.email ? `(${oauthStatus.google.email})` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F4F1EA] text-[#736E67] border border-[#E5E2DC]">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#736E67] mt-0.5 leading-snug">
                  Unified Google authorization. Read specifications & export briefs to Google Docs; inspect operational support threads & draft replies in Gmail.
                </p>
                {oauthStatus?.google.connected && oauthStatus.google.connectedAt && (
                  <p className="text-[10px] text-[#858079] mt-1 font-mono">
                    Authorized on: {new Date(oauthStatus.google.connectedAt).toLocaleDateString()} · Background refresh active
                  </p>
                )}
              </div>
            </div>

            {/* Action Button: Connect vs Disconnect */}
            <div className="shrink-0 flex items-center gap-2">
              {oauthStatus?.google.connected ? (
                <button
                  type="button"
                  id="disconnect-google-btn"
                  disabled={disconnectingProvider === 'google'}
                  onClick={() => handleDisconnect('google')}
                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{disconnectingProvider === 'google' ? 'Disconnecting...' : 'Disconnect'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="connect-google-btn"
                  disabled={connectingProvider === 'google' || isLoadingStatus}
                  onClick={() => handleConnect('google')}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{connectingProvider === 'google' ? 'Opening Google...' : 'Connect Google'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tool tags */}
          <div className="pt-2 border-t border-[#E5E2DC]/80">
            <span className="text-[10px] uppercase font-semibold text-[#858079] tracking-wider block mb-1.5">
              Available Google Workspace MCP Tools:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'gdocs_read_document', desc: 'Fetch formatted document body' },
                { name: 'gdocs_list_documents', desc: 'Search and list Google Drive docs' },
                { name: 'gdocs_create_brief', desc: 'Export research synthesis to live Google Doc' },
                { name: 'gmail_list_threads', desc: 'Query email threads with filters' },
                { name: 'gmail_read_thread', desc: 'Retrieve full email contents' },
                { name: 'gmail_draft_response', desc: 'Stage email drafts in Gmail' },
              ].map((t) => (
                <span
                  key={t.name}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F1EA] text-[#3D3A37] border border-[#E5E2DC]"
                  title={t.desc}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Test Handshakes */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E2DC]/50 text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                id="test-docs-handshake-btn"
                disabled={testingId === 'google-docs'}
                onClick={() => handleTestConnection('google-docs')}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingId === 'google-docs' ? 'animate-spin' : ''}`} />
                <span>{testingId === 'google-docs' ? 'Querying Docs...' : 'Test Google Docs Handshake'}</span>
              </button>

              <button
                type="button"
                id="test-gmail-handshake-btn"
                disabled={testingId === 'gmail'}
                onClick={() => handleTestConnection('gmail')}
                className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingId === 'gmail' ? 'animate-spin' : ''}`} />
                <span>{testingId === 'gmail' ? 'Querying Gmail...' : 'Test Gmail Handshake'}</span>
              </button>
            </div>

            {(testResult?.id === 'google-docs' || testResult?.id === 'gmail' || testResult?.id === 'google') && (
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  testResult.success ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* OAuth App Registration Guide (Collapsible) */}
      <div className="border border-[#E5E2DC] rounded-xl bg-[#FBF9F5] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-[#F3EFEA] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#736E67]" />
            <span className="text-xs font-semibold text-[#1F1E1D]">
              OAuth App Registration & Callback URLs Guide
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#736E67]">
            <span>{showSetupGuide ? 'Hide setup instructions' : 'View callback URLs & secrets'}</span>
            {showSetupGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showSetupGuide && (
          <div className="p-4 border-t border-[#E5E2DC] space-y-4 text-xs text-[#55504A] bg-white">
            <p className="leading-relaxed">
              To connect real accounts in production, register an OAuth App in GitHub Developer Settings and an OAuth Client ID in Google Cloud Console with these exact callback URLs:
            </p>

            <div className="space-y-3">
              {/* GitHub App Config */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E2DC] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5" /> GitHub Authorization Callback URL
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(githubCallbackUrl, 'gh_cb')}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedKey === 'gh_cb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'gh_cb' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[11px] text-[#1F1E1D] bg-white px-2 py-1.5 rounded border border-[#E5E2DC] break-all">
                  {githubCallbackUrl}
                </code>
                <p className="text-[11px] text-[#736E67]">
                  Register at <code className="text-[#1F1E1D]">github.com/settings/developers</code> → New OAuth App. Required environment variables: <code className="text-[#1F1E1D]">GITHUB_OAUTH_CLIENT_ID</code>, <code className="text-[#1F1E1D]">GITHUB_OAUTH_CLIENT_SECRET</code>.
                </p>
              </div>

              {/* Google App Config */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E5E2DC] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-500" /> Google Authorized Redirect URI
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(googleCallbackUrl, 'google_cb')}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedKey === 'google_cb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'google_cb' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[11px] text-[#1F1E1D] bg-white px-2 py-1.5 rounded border border-[#E5E2DC] break-all">
                  {googleCallbackUrl}
                </code>
                <p className="text-[11px] text-[#736E67]">
                  Register at <code className="text-[#1F1E1D]">console.cloud.google.com/apis/credentials</code> → OAuth 2.0 Client IDs (Web application). Required environment variables: <code className="text-[#1F1E1D]">GOOGLE_OAUTH_CLIENT_ID</code>, <code className="text-[#1F1E1D]">GOOGLE_OAUTH_CLIENT_SECRET</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced: Custom MCP Server (For Power Users) */}
      <div className="pt-2 border-t border-[#E5E2DC]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-semibold text-[#1F1E1D] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-600" />
              Advanced: Custom Model Context Protocol (MCP) Servers
            </h4>
            <p className="text-[11px] text-[#736E67]">
              Optional for power users wishing to connect remote custom MCP endpoints over SSE or HTTP.
            </p>
          </div>
        </div>

        {/* Existing Custom Servers */}
        {customConnectors.length > 0 && (
          <div className="space-y-2 mb-3">
            {customConnectors.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg border border-[#E5E2DC] bg-white flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-[#1F1E1D]">{c.name}</span>
                  <p className="text-[11px] text-[#736E67] font-mono">{c.endpointUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(c.name)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Test Handshake
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(c.id)}
                    className="p-1 text-[#A8A298] hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showAddCustom ? (
          <button
            type="button"
            onClick={() => setShowAddCustom(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-[#D5D0C7] hover:border-[#1F1E1D] text-xs font-medium text-[#55504A] hover:text-[#1F1E1D] transition-colors cursor-pointer flex items-center justify-center gap-2 bg-white/50"
          >
            <Plus className="w-4 h-4 text-purple-600" />
            <span>Connect Custom MCP Server (Remote Endpoint)</span>
          </button>
        ) : (
          <form
            onSubmit={handleAddCustom}
            className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-600" />
                Register Custom MCP Server
              </h5>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="text-xs text-[#736E67] hover:text-[#1F1E1D]"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#55504A] mb-1">Connector Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Jira MCP Server"
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#55504A] mb-1">Server URL (SSE / HTTP)</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://mcp.your-org.internal/sse"
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#55504A] mb-1">
                Bearer Authorization Token (Optional)
              </label>
              <input
                type="password"
                value={customAuthToken}
                onChange={(e) => setCustomAuthToken(e.target.value)}
                placeholder="Bearer mcp_sec_..."
                className="w-full px-3 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="px-3 py-1.5 rounded-lg border border-[#D5D0C7] text-xs text-[#55504A] hover:bg-[#F3EFEA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Save MCP Server
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
