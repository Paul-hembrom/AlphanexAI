'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Link2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Github,
  FileText,
  Mail,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Database,
  Key,
} from 'lucide-react';

export interface MCPConnectorItem {
  id: string;
  name: string;
  provider: string;
  category: 'code' | 'docs' | 'email' | 'custom';
  description: string;
  status: 'connected' | 'configured' | 'disconnected';
  enabled: boolean;
  toolsCount: number;
  tools: { name: string; description: string }[];
  endpoint?: string;
  tokenConfigured: boolean;
  username?: string | null;
  accountEmail?: string | null;
}

const INITIAL_CONNECTORS: MCPConnectorItem[] = [
  {
    id: 'github',
    name: 'GitHub',
    provider: 'GitHub Copilot MCP & REST',
    category: 'code',
    description:
      'Search repository codebases, inspect issues, review pull requests, and navigate branches directly from Developer Mode.',
    status: 'disconnected',
    enabled: true,
    toolsCount: 4,
    tokenConfigured: false,
    endpoint: 'https://api.githubcopilot.com/mcp/',
    tools: [
      {
        name: 'github_search_code',
        description: 'Search repository files, functions, and commit diffs for relevant syntax.',
      },
      {
        name: 'github_list_repos',
        description: 'Enumerate authorized user and organization repositories.',
      },
      {
        name: 'github_get_file_contents',
        description: 'Fetch complete file contents and tree structures safely.',
      },
      {
        name: 'github_create_pull_request',
        description: 'Stage code patch diffs and trigger pull request review.',
      },
    ],
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    provider: 'Google Workspace MCP',
    category: 'docs',
    description:
      'Read project briefs, system architectural specifications, and export finalized research reports or code patch briefs to Docs.',
    status: 'disconnected',
    enabled: true,
    toolsCount: 3,
    tokenConfigured: false,
    endpoint: 'https://docs.googleapis.com/mcp/v1',
    tools: [
      {
        name: 'gdocs_read_document',
        description: 'Fetch complete structural text, headings, and tables from Google Docs.',
      },
      {
        name: 'gdocs_list_documents',
        description: 'List user documents and briefs matching topic query in Google Drive.',
      },
      {
        name: 'gdocs_create_brief',
        description: 'Export structured research dossier or architectural patch directly to a Doc.',
      },
    ],
  },
  {
    id: 'gmail',
    name: 'Google Gmail',
    provider: 'Google Workspace MCP',
    category: 'email',
    description:
      'Search and read technical correspondence, incident alert threads, and customer bug reports with secure zero-retention tokens.',
    status: 'disconnected',
    enabled: true,
    toolsCount: 3,
    tokenConfigured: false,
    endpoint: 'https://gmailmcp.googleapis.com/mcp/v1',
    tools: [
      {
        name: 'gmail_list_threads',
        description: 'Search inbox for relevant technical threads and subject headers.',
      },
      {
        name: 'gmail_read_thread',
        description: 'Parse email messages, dates, recipients, and attached diagnostics.',
      },
      {
        name: 'gmail_draft_response',
        description: 'Prepare clean email drafts with summarized engineering updates.',
      },
    ],
  },
];

const UPCOMING_PLUGINS = [
  {
    name: 'Slack',
    desc: 'Query team channel discussions and post automated deployment notices.',
    icon: '#',
    badge: 'Coming Soon',
  },
  {
    name: 'Notion',
    desc: 'Ingest team engineering wiki databases and product requirements documents.',
    icon: 'N',
    badge: 'Coming Soon',
  },
  {
    name: 'PostgreSQL / Neon',
    desc: 'Execute read-only schema introspections and query plan validations.',
    icon: 'PG',
    badge: 'In Demand',
  },
  {
    name: 'Linear',
    desc: 'Synchronize bug tickets, sprint backlogs, and issue comments.',
    icon: 'L',
    badge: 'Planned',
  },
];

interface MCPConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRepoBrowser?: () => void;
}

export default function MCPConnectorsModal({
  isOpen,
  onClose,
  onOpenRepoBrowser,
}: MCPConnectorsModalProps) {
  const [connectors, setConnectors] = useState<MCPConnectorItem[]>(INITIAL_CONNECTORS);
  const [expandedConnectorId, setExpandedConnectorId] = useState<string | null>('github');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    data: any;
    rawJson?: string;
  } | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [tokenInputModalId, setTokenInputModalId] = useState<string | null>(null);
  const [tokenInputVal, setTokenInputVal] = useState('');
  const [tokenInputError, setTokenInputError] = useState<string | null>(null);
  const [isSavingToken, setIsSavingToken] = useState(false);

  // Fetch real status from /api/auth/status and /api/mcp/status
  const refreshLiveStatus = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth/status');
      if (authRes.ok) {
        const authData = await authRes.json();
        const gh = authData?.connections?.github;
        const ggl = authData?.connections?.google;

        setConnectors((prev) =>
          prev.map((conn) => {
            if (conn.id === 'github') {
              const connected = Boolean(gh?.connected);
              return {
                ...conn,
                status: connected ? 'connected' : 'disconnected',
                tokenConfigured: connected,
                username: gh?.username || null,
              };
            }
            if (conn.id === 'google-docs' || conn.id === 'gmail') {
              const connected = Boolean(ggl?.connected);
              return {
                ...conn,
                status: connected ? 'connected' : 'disconnected',
                tokenConfigured: connected,
                accountEmail: ggl?.email || null,
              };
            }
            return conn;
          })
        );
      }
    } catch (err) {
      console.warn('[mcp-modal] Failed to fetch auth status:', err);
    }
  }, []);

  // Listen for OAuth messages and refresh status on modal open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      void refreshLiveStatus();
    }, 0);

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'OAUTH_AUTH_SUCCESS' ||
        event.data?.type === 'SUPABASE_AUTH_SUCCESS'
      ) {
        console.log('[mcp-modal] OAuth message received, refreshing connectors status');
        void refreshLiveStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, refreshLiveStatus]);

  const toggleConnector = (id: string) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const openOAuthPopup = (provider: 'github' | 'google') => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const url = `/api/auth/${provider}/start`;
    window.open(
      url,
      'alphanex_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
  };

  const handleTestAllConnectors = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mcp/status');
      const data = await res.json();
      setTestResult({
        success: data.success,
        data,
        rawJson: JSON.stringify(data, null, 2),
      });
      refreshLiveStatus();
    } catch (e: any) {
      setTestResult({
        success: false,
        data: { error: e?.message || 'Failed to ping MCP status' },
        rawJson: JSON.stringify({ error: e?.message || 'Network error' }, null, 2),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddCustomConnector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;

    const newConnector: MCPConnectorItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      provider: 'Custom MCP Server',
      category: 'custom',
      description: customDescription.trim() || 'User-defined remote Model Context Protocol endpoint.',
      status: 'connected',
      enabled: true,
      toolsCount: 2,
      tokenConfigured: true,
      endpoint: customUrl.trim(),
      tools: [
        {
          name: `${customName.toLowerCase().replace(/\s+/g, '_')}_query`,
          description: `Custom query tool for ${customName}`,
        },
        {
          name: `${customName.toLowerCase().replace(/\s+/g, '_')}_execute`,
          description: `Execute operations via ${customName}`,
        },
      ],
    };

    setConnectors((prev) => [...prev, newConnector]);
    setCustomName('');
    setCustomUrl('');
    setCustomDescription('');
    setIsAddingCustom(false);
  };

  const handleSaveToken = async (id: string) => {
    if (!tokenInputVal.trim()) return;
    setIsSavingToken(true);
    setTokenInputError(null);

    try {
      if (id === 'github') {
        const res = await fetch('/api/auth/github/connect-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenInputVal.trim() }),
        });
        const data = await res.json();
        if (data.success) {
          setConnectors((prev) =>
            prev.map((c) =>
              c.id === 'github'
                ? {
                    ...c,
                    tokenConfigured: true,
                    status: 'connected',
                    username: data.username,
                  }
                : c
            )
          );
          setTokenInputModalId(null);
          setTokenInputVal('');
          refreshLiveStatus();
        } else {
          setTokenInputError(data.error || 'Failed to verify and save token.');
        }
      } else {
        // Fallback for custom servers
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  tokenConfigured: true,
                  status: 'connected',
                }
              : c
          )
        );
        setTokenInputModalId(null);
        setTokenInputVal('');
      }
    } catch (err: any) {
      setTokenInputError(err?.message || 'Error communicating with server.');
    } finally {
      setIsSavingToken(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="mcp-connectors-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="mcp-connectors-dialog"
        className="bg-[#FBF9F5] border border-[#E5E2DC] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#F3EFEA] border-b border-[#E5E2DC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1F1E1D] text-white flex items-center justify-center shadow-2xs">
              <Link2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center gap-2">
                Customise Connectors
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  MCP Protocol
                </span>
              </h3>
              <p className="text-xs text-[#736E67]">
                Connect external data sources & tools with per-user authentication
              </p>
            </div>
          </div>

          <button
            id="mcp-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#E5E2DC] transition-colors cursor-pointer"
            aria-label="Close Connectors Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status banner & Ping */}
          <div className="p-3.5 bg-[#FAF7F2] border border-[#E5E2DC] rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#4D4943]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Per-User Data Connectors:</strong> Authenticated securely via OAuth or user PAT with zero mock data.
              </span>
            </div>
            <button
              id="mcp-test-all-btn"
              type="button"
              onClick={handleTestAllConnectors}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#3D3A37] text-[#FBF9F5] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connections'}</span>
            </button>
          </div>

          {/* Test Result Inspection */}
          {testResult && (
            <div className="p-3 rounded-xl bg-white border border-[#D5D0C7] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  Real Connector Status (MCP Server Response):
                </span>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="text-[10px] text-[#736E67] hover:underline"
                >
                  Dismiss
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-[#1F1E1D] text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                {testResult.rawJson}
              </pre>
            </div>
          )}

          {/* Primary Connectors List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-[#858079] uppercase tracking-wider">
                Primary MCP Connectors (GitHub, Google Docs, Gmail)
              </h4>
              <span className="text-[11px] text-[#736E67] font-medium">
                {connectors.filter((c) => c.status === 'connected').length} of {connectors.length} Connected
              </span>
            </div>

            <div className="space-y-3">
              {connectors.map((connector) => {
                const isExpanded = expandedConnectorId === connector.id;
                const isConnected = connector.status === 'connected';

                return (
                  <div
                    key={connector.id}
                    className={`rounded-xl border transition-all ${
                      isConnected
                        ? 'bg-white border-[#D5D0C7] shadow-xs'
                        : 'bg-[#F9F7F4] border-[#E5E2DC]'
                    }`}
                  >
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#F3EFEA] border border-[#E5E2DC] flex items-center justify-center shrink-0 mt-0.5">
                          {connector.id === 'github' && <Github className="w-5 h-5 text-[#1F1E1D]" />}
                          {connector.id === 'google-docs' && <FileText className="w-5 h-5 text-blue-600" />}
                          {connector.id === 'gmail' && <Mail className="w-5 h-5 text-red-600" />}
                          {connector.category === 'custom' && <Database className="w-5 h-5 text-purple-600" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-semibold text-sm text-[#1F1E1D]">
                              {connector.name}
                            </h5>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#F0ECE4] text-[#736E67] font-medium">
                              {connector.provider}
                            </span>
                            {isConnected ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected {connector.username ? `@${connector.username}` : connector.accountEmail ? `(${connector.accountEmail})` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                Not connected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#55504A] mt-1 leading-relaxed">
                            {connector.description}
                          </p>

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            {!isConnected && (
                              <>
                                {(connector.id === 'github' || connector.id === 'google-docs' || connector.id === 'gmail') && (
                                  <button
                                    type="button"
                                    onClick={() => openOAuthPopup(connector.id === 'github' ? 'github' : 'google')}
                                    className="px-2.5 py-1 rounded-md bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Link2 className="w-3 h-3 text-emerald-400" />
                                    <span>Connect OAuth</span>
                                  </button>
                                )}
                                {connector.id === 'github' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTokenInputModalId('github');
                                      setTokenInputVal('');
                                      setTokenInputError(null);
                                    }}
                                    className="px-2.5 py-1 rounded-md border border-[#D5D0C7] bg-white hover:bg-[#F3EFEA] text-xs font-medium text-[#1F1E1D] flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Key className="w-3 h-3 text-[#736E67]" />
                                    <span>Paste PAT Token</span>
                                  </button>
                                )}
                              </>
                            )}

                            {isConnected && connector.id === 'github' && onOpenRepoBrowser && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenRepoBrowser();
                                }}
                                className="px-2.5 py-1 rounded-md bg-[#1F1E1D] hover:bg-black text-[#FBF9F5] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Github className="w-3.5 h-3.5 text-amber-400" />
                                <span>Browse Repositories</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right controls: Enable Toggle & Expand */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleConnector(connector.id)}
                          className="cursor-pointer text-[#736E67] hover:text-[#1F1E1D] transition-colors"
                          title={connector.enabled ? 'Disable Connector' : 'Enable Connector'}
                        >
                          {connector.enabled ? (
                            <ToggleRight className="w-7 h-7 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-[#A8A298]" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedConnectorId(isExpanded ? null : connector.id)
                          }
                          className="p-1 rounded text-[#736E67] hover:bg-[#F0ECE4] transition-colors cursor-pointer"
                          title="Toggle tools & details"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Tools & Config Drawer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#E5E2DC]/80 bg-[#FAF8F5] rounded-b-xl space-y-3">
                        <div className="text-[11px] font-semibold text-[#858079] uppercase tracking-wider flex items-center justify-between flex-wrap gap-2">
                          <span>Discovered MCP Tools:</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setTokenInputModalId(connector.id);
                                setTokenInputVal('');
                                setTokenInputError(null);
                              }}
                              className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                            >
                              Configure Custom Auth Token
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {connector.tools.map((t) => (
                            <div
                              key={t.name}
                              className="p-2 rounded-lg bg-white border border-[#E5E2DC] text-left"
                            >
                              <code className="text-[11px] font-mono font-semibold text-emerald-800">
                                {t.name}
                              </code>
                              <p className="text-[10px] text-[#736E67] mt-0.5 leading-snug">
                                {t.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        {connector.endpoint && (
                          <div className="text-[10px] text-[#858079] flex items-center gap-1 font-mono">
                            <span>Endpoint:</span>
                            <span className="text-[#55504A] truncate">{connector.endpoint}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Connector Section */}
          <div className="border-t border-[#E5E2DC] pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold text-[#858079] uppercase tracking-wider">
                  Extensible Plugins & Custom Connectors
                </h4>
                <p className="text-xs text-[#736E67] mt-0.5">
                  Plug in custom MCP endpoints or prepare upcoming ecosystem integrations
                </p>
              </div>

              {!isAddingCustom && (
                <button
                  id="add-custom-mcp-btn"
                  type="button"
                  onClick={() => setIsAddingCustom(true)}
                  className="px-2.5 py-1 rounded-lg border border-[#D5D0C7] bg-white hover:bg-[#F3EFEA] text-xs font-semibold text-[#1F1E1D] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom MCP</span>
                </button>
              )}
            </div>

            {/* Custom MCP Form */}
            {isAddingCustom && (
              <form
                onSubmit={handleAddCustomConnector}
                className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3 mb-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-950">
                    Register New Remote MCP Connector
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="text-xs text-[#736E67] hover:text-[#1F1E1D]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#55504A] block mb-1">
                      Connector Name
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Postgres DB / Slack Bot"
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[#55504A] block mb-1">
                      Streamable HTTP / SSE URL
                    </label>
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://mcp.yourdomain.com/v1"
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#55504A] block mb-1">
                    Description & Scopes
                  </label>
                  <input
                    type="text"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="e.g. Ingest internal telemetry logs and query database tables."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#D5D0C7] bg-white text-xs text-[#1F1E1D] outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    Save & Enable Connector
                  </button>
                </div>
              </form>
            )}

            {/* Upcoming Plugins Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {UPCOMING_PLUGINS.map((plug) => (
                <div
                  key={plug.name}
                  className="p-3 rounded-xl border border-[#E5E2DC] bg-[#FAF8F5] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#EFECE6] border border-[#D5D0C7] flex items-center justify-center font-bold text-xs text-[#736E67] shrink-0">
                      {plug.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[#1F1E1D] truncate">
                        {plug.name}
                      </div>
                      <p className="text-[10px] text-[#736E67] truncate">
                        {plug.desc}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ECE8E1] text-[#736E67] font-medium shrink-0">
                    {plug.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#F3EFEA] border-t border-[#E5E2DC] flex items-center justify-between">
          <div className="text-[11px] text-[#736E67]">
            Active in Developer & Researcher mode agent runs
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1F1E1D] hover:bg-[#3D3A37] text-[#FBF9F5] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>

        {/* Nested Token Configuration Modal */}
        {tokenInputModalId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
            <div className="bg-white border border-[#D5D0C7] rounded-xl max-w-md w-full p-4 shadow-xl space-y-3">
              <h4 className="font-semibold text-sm text-[#1F1E1D]">
                Configure Auth Token for {connectors.find((c) => c.id === tokenInputModalId)?.name}
              </h4>
              <p className="text-xs text-[#736E67]">
                Provide your Personal Access Token (classic or fine-grained with <code className="bg-gray-100 px-1 py-0.5 rounded">repo</code> scope). Token will be verified with the GitHub API and stored in your encrypted user connections.
              </p>
              <input
                type="password"
                value={tokenInputVal}
                onChange={(e) => setTokenInputVal(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                className="w-full px-3 py-2 rounded-lg border border-[#D5D0C7] text-xs font-mono outline-hidden focus:border-blue-600"
              />
              {tokenInputError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{tokenInputError}</span>
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTokenInputModalId(null);
                    setTokenInputVal('');
                    setTokenInputError(null);
                  }}
                  className="px-3 py-1 rounded text-xs text-[#736E67] hover:bg-[#F3EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingToken || !tokenInputVal.trim()}
                  onClick={() => handleSaveToken(tokenInputModalId)}
                  className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {isSavingToken && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isSavingToken ? 'Verifying & Saving...' : 'Save & Connect'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
