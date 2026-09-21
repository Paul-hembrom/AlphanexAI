'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Github,
  GitBranch,
  Folder,
  FileCode2,
  FileText,
  Check,
  Search,
  RefreshCw,
  ArrowLeft,
  Lock,
  Globe,
  Star,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Key,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { ChatAttachment } from '@/lib/types';
import { getStoredProfile } from '@/lib/supabase';

export interface RepoItem {
  id: number | string;
  name: string;
  fullName: string;
  owner?: string;
  url: string;
  private: boolean;
  defaultBranch: string;
  description?: string;
  updatedAt?: string;
  stargazersCount?: number;
  language?: string;
}

export interface RepoTreeNode {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha?: string;
}

interface RepoBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachFiles: (files: ChatAttachment[]) => void;
  userId?: string;
}

export default function RepoBrowserModal({
  isOpen,
  onClose,
  onAttachFiles,
  userId: propUserId,
}: RepoBrowserModalProps) {
  const [resolvedUserId, setResolvedUserId] = useState<string>(() => {
    if (propUserId) return propUserId;
    if (typeof window !== 'undefined') {
      try {
        const prof = getStoredProfile();
        if (prof?.id) return prof.id;
      } catch {}
    }
    return 'usr_guest_local';
  });

  // Connection & Auth State
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  const [tokenSource, setTokenSource] = useState<string>('none');
  const [customPat, setCustomPat] = useState('');
  const [isSavingPat, setIsSavingPat] = useState(false);
  const [patError, setPatError] = useState<string | null>(null);
  const [showPatInput, setShowPatInput] = useState(false);

  // Repositories State
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoFilter, setRepoFilter] = useState<'all' | 'public' | 'private'>('all');
  const [repoError, setRepoError] = useState<string | null>(null);

  // Selected Repo & Tree State
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [treeNodes, setTreeNodes] = useState<RepoTreeNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeSearch, setTreeSearch] = useState('');
  const [treeError, setTreeError] = useState<string | null>(null);

  // Selected Files State
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Attachment Progress
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachProgress, setAttachProgress] = useState<{ current: number; total: number; filename: string } | null>(null);

  // 1. Check GitHub OAuth / Connection Status
  const checkAuthStatus = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch(`/api/auth/status?userId=${encodeURIComponent(resolvedUserId)}`);
      if (res.ok) {
        const data = await res.json();
        const gh = data?.connections?.github;
        if (gh?.connected) {
          setGithubConnected(true);
          setConnectedUsername(gh.username || 'Authorized User');
          setTokenSource(gh.source || 'user_oauth');
        } else {
          setGithubConnected(false);
          setConnectedUsername(null);
          setTokenSource('none');
        }
      }
    } catch (err) {
      console.warn('Could not check GitHub status:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [resolvedUserId]);

  // 2. Fetch User's Repositories
  const fetchRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      const res = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_repos',
          userId: resolvedUserId,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRepos(data.data);
        if (data.tokenSource && data.tokenSource.includes('User OAuth')) {
          setGithubConnected(true);
        }
      } else {
        setRepoError(data.error || 'Failed to list repositories');
      }
    } catch (err: any) {
      setRepoError(err?.message || 'Error fetching repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  }, [resolvedUserId]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const initializeModal = async () => {
      await Promise.resolve();
      if (isMounted) {
        checkAuthStatus();
        fetchRepos();
      }
    };
    initializeModal();
    return () => {
      isMounted = false;
    };
  }, [isOpen, checkAuthStatus, fetchRepos]);

  // 3. Connect via Personal Access Token
  const handleConnectPat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPat.trim()) return;
    setIsSavingPat(true);
    setPatError(null);
    try {
      const res = await fetch('/api/auth/github/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: customPat.trim(),
          userId: resolvedUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubConnected(true);
        setConnectedUsername(data.username);
        setCustomPat('');
        setShowPatInput(false);
        await fetchRepos();
      } else {
        setPatError(data.error || 'Failed to connect token');
      }
    } catch (err: any) {
      setPatError(err?.message || 'Token verification failed');
    } finally {
      setIsSavingPat(false);
    }
  };

  // 4. Fetch Repository Tree
  const fetchRepoTree = useCallback(
    async (repo: RepoItem, branchName?: string) => {
      setIsLoadingTree(true);
      setTreeError(null);
      setSelectedPaths(new Set());
      const branch = branchName || repo.defaultBranch || 'main';
      setSelectedBranch(branch);

      const [owner, repoName] = repo.fullName.includes('/')
        ? repo.fullName.split('/')
        : [repo.owner || 'user', repo.name];

      try {
        const res = await fetch('/api/integrations/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_repo_tree',
            owner,
            repo: repoName,
            branch,
            userId: resolvedUserId,
          }),
        });
        const data = await res.json();
        if (data.success && data.data?.tree) {
          setTreeNodes(data.data.tree);
        } else {
          setTreeError(data.error || 'Could not load repository tree');
        }
      } catch (err: any) {
        setTreeError(err?.message || 'Error loading file tree');
      } finally {
        setIsLoadingTree(false);
      }
    },
    [resolvedUserId]
  );

  const handleSelectRepo = (repo: RepoItem) => {
    setSelectedRepo(repo);
    fetchRepoTree(repo);
  };

  const handleBackToRepos = () => {
    setSelectedRepo(null);
    setTreeNodes([]);
    setSelectedPaths(new Set());
    setPreviewFile(null);
  };

  // Toggle file selection
  const toggleSelectFile = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Toggle all files in a folder
  const toggleSelectFolder = (folderPath: string) => {
    const filesUnderFolder = treeNodes
      .filter((n) => n.type === 'blob' && n.path.startsWith(`${folderPath}/`))
      .map((n) => n.path);

    if (filesUnderFolder.length === 0) return;

    setSelectedPaths((prev) => {
      const next = new Set(prev);
      const allSelected = filesUnderFolder.every((p) => next.has(p));
      if (allSelected) {
        filesUnderFolder.forEach((p) => next.delete(p));
      } else {
        filesUnderFolder.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  // Select all or deselect all visible files
  const handleSelectAllVisible = (files: RepoTreeNode[]) => {
    const blobPaths = files.filter((n) => n.type === 'blob').map((n) => n.path);
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      const allSelected = blobPaths.every((p) => next.has(p));
      if (allSelected) {
        blobPaths.forEach((p) => next.delete(p));
      } else {
        blobPaths.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  // Preview single file
  const handlePreviewFile = async (path: string) => {
    if (!selectedRepo) return;
    if (previewFile?.path === path) {
      setPreviewFile(null);
      return;
    }
    setIsLoadingPreview(true);
    const [owner, repoName] = selectedRepo.fullName.includes('/')
      ? selectedRepo.fullName.split('/')
      : [selectedRepo.owner || 'user', selectedRepo.name];

    try {
      const res = await fetch('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_file_contents',
          owner,
          repo: repoName,
          path,
          branch: selectedBranch,
          userId: resolvedUserId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.content !== undefined) {
        setPreviewFile({ path, content: data.data.content });
      }
    } catch (err) {
      console.warn('Could not preview file:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Attach selected files: fetch real contents and pass to callback
  const handleAttachSelected = async () => {
    if (!selectedRepo || selectedPaths.size === 0 || isAttaching) return;

    setIsAttaching(true);
    const [owner, repoName] = selectedRepo.fullName.includes('/')
      ? selectedRepo.fullName.split('/')
      : [selectedRepo.owner || 'user', selectedRepo.name];

    const pathsToFetch = Array.from(selectedPaths);
    const attachments: ChatAttachment[] = [];

    try {
      for (let i = 0; i < pathsToFetch.length; i++) {
        const path = pathsToFetch[i];
        const filename = path.split('/').pop() || path;
        setAttachProgress({ current: i + 1, total: pathsToFetch.length, filename });

        const res = await fetch('/api/integrations/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_file_contents',
            owner,
            repo: repoName,
            path,
            branch: selectedBranch,
            userId: resolvedUserId,
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          attachments.push({
            id: `repo-att-${Date.now()}-${i}`,
            name: filename,
            path: data.data.path || path,
            content: data.data.content || '',
            size: data.data.size ?? data.data.content?.length ?? 0,
            repo: selectedRepo.fullName,
            branch: selectedBranch,
            type: 'repo_file',
          });
        }
      }

      if (attachments.length > 0) {
        onAttachFiles(attachments);
        onClose();
      }
    } catch (err) {
      console.error('Failed to attach files:', err);
    } finally {
      setIsAttaching(false);
      setAttachProgress(null);
    }
  };

  // Filtered repositories
  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase())) ||
        r.fullName.toLowerCase().includes(repoSearch.toLowerCase());

      const matchFilter =
        repoFilter === 'all' ||
        (repoFilter === 'public' && !r.private) ||
        (repoFilter === 'private' && r.private);

      return matchSearch && matchFilter;
    });
  }, [repos, repoSearch, repoFilter]);

  // Filtered tree nodes
  const filteredTreeNodes = useMemo(() => {
    if (!treeSearch.trim()) return treeNodes;
    const query = treeSearch.toLowerCase();
    return treeNodes.filter((n) => n.path.toLowerCase().includes(query));
  }, [treeNodes, treeSearch]);

  const totalSelectedSize = useMemo(() => {
    let size = 0;
    selectedPaths.forEach((path) => {
      const node = treeNodes.find((n) => n.path === path);
      if (node?.size) size += node.size;
    });
    return size;
  }, [selectedPaths, treeNodes]);

  if (!isOpen) return null;

  return (
    <div
      id="repo-browser-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#FBF9F5] rounded-2xl border border-[#E5E2DC] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E2DC] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F1E1D] flex items-center justify-center text-white shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1F1E1D]">
                  Connect GitHub Repository
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live Context
                </span>
              </div>
              <p className="text-xs text-[#736E67]">
                Browse your repositories and pull selected files into conversation context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer"
            aria-label="Close repository browser"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account & Connection Bar */}
        <div className="px-5 py-2.5 bg-[#F4F1EB] border-b border-[#E5E2DC] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#736E67]">GitHub Status:</span>
            {isCheckingAuth ? (
              <span className="flex items-center gap-1 text-[#736E67]">
                <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
              </span>
            ) : githubConnected ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected as <strong className="font-semibold">@{connectedUsername}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Not authenticated (Sample manifest loaded)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!githubConnected && (
              <>
                <a
                  href={`/api/auth/github/start?userId=${encodeURIComponent(resolvedUserId)}`}
                  className="px-2.5 py-1 rounded-lg bg-[#1F1E1D] text-white font-medium hover:bg-black transition-colors flex items-center gap-1"
                >
                  <Github className="w-3 h-3" />
                  <span>Connect OAuth</span>
                </a>
                <button
                  onClick={() => setShowPatInput(!showPatInput)}
                  className="px-2.5 py-1 rounded-lg border border-[#D5D0C7] bg-[#FBF9F5] text-[#1F1E1D] font-medium hover:bg-[#EFECE6] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  <span>Use Access Token</span>
                </button>
              </>
            )}
            {githubConnected && (
              <button
                onClick={() => setShowPatInput(!showPatInput)}
                className="text-[11px] text-[#736E67] hover:text-[#1F1E1D] underline cursor-pointer"
              >
                Change Token
              </button>
            )}
          </div>
        </div>

        {/* Expandable PAT Input */}
        {showPatInput && (
          <form
            onSubmit={handleConnectPat}
            className="p-4 bg-white border-b border-[#E5E2DC] flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1F1E1D]">
                Enter GitHub Personal Access Token (Classic or Fine-Grained)
              </span>
              <button
                type="button"
                onClick={() => setShowPatInput(false)}
                className="text-xs text-[#736E67] hover:text-[#1F1E1D]"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
                value={customPat}
                onChange={(e) => setCustomPat(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D5D0C7] focus:outline-hidden focus:ring-1 focus:ring-[#1F1E1D] bg-[#FBF9F5]"
              />
              <button
                type="submit"
                disabled={isSavingPat || !customPat.trim()}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1F1E1D] text-white hover:bg-black disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isSavingPat ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
                  </>
                ) : (
                  'Connect Token'
                )}
              </button>
            </div>
            {patError && <p className="text-[11px] text-red-600">{patError}</p>}
            <p className="text-[11px] text-[#736E67]">
              Token needs <code className="px-1 py-0.5 bg-gray-100 rounded">repo</code> scope to read
              private repositories and files. Tokens are encrypted server-side with AES-256-GCM.
            </p>
          </form>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 min-h-[360px]">
          {!selectedRepo ? (
            /* STEP 1: SELECT REPOSITORY */
            <div className="flex flex-col gap-3">
              {/* Search and Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#736E67]" />
                  <input
                    type="text"
                    placeholder="Search repositories by name or description..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-[#D5D0C7] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1F1E1D]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#EFECE6] p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setRepoFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      repoFilter === 'all'
                        ? 'bg-white text-[#1F1E1D] shadow-xs'
                        : 'text-[#736E67] hover:text-[#1F1E1D]'
                    }`}
                  >
                    All ({repos.length})
                  </button>
                  <button
                    onClick={() => setRepoFilter('public')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      repoFilter === 'public'
                        ? 'bg-white text-[#1F1E1D] shadow-xs'
                        : 'text-[#736E67] hover:text-[#1F1E1D]'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    onClick={() => setRepoFilter('private')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      repoFilter === 'private'
                        ? 'bg-white text-[#1F1E1D] shadow-xs'
                        : 'text-[#736E67] hover:text-[#1F1E1D]'
                    }`}
                  >
                    Private
                  </button>
                </div>

                <button
                  onClick={fetchRepos}
                  disabled={isLoadingRepos}
                  className="p-1.5 rounded-lg border border-[#D5D0C7] bg-white text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                  title="Refresh repository list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Repo List */}
              {isLoadingRepos ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#736E67]">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Loading authorized repositories from GitHub...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#736E67] border border-dashed border-[#D5D0C7] rounded-xl bg-white/50">
                  {repoSearch ? 'No repositories match your search query.' : 'No repositories found.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className="group p-3.5 rounded-xl border border-[#E5E2DC] bg-white hover:border-[#1F1E1D] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-xs text-[#1F1E1D] group-hover:text-blue-600 transition-colors truncate">
                            {repo.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                              repo.private
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {repo.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#736E67] line-clamp-2 leading-relaxed">
                          {repo.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#736E67] pt-2 border-t border-[#F0ECE1]">
                        <div className="flex items-center gap-2">
                          {repo.language && (
                            <span className="flex items-center gap-1 font-medium text-[#1F1E1D]">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <GitBranch className="w-2.5 h-2.5" />
                            {repo.defaultBranch || 'main'}
                          </span>
                          {repo.stargazersCount !== undefined && repo.stargazersCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {repo.stargazersCount}
                            </span>
                          )}
                        </div>
                        <span className="text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
                          Browse files →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: BROWSE TREE & SELECT FILES */
            <div className="flex flex-col gap-3">
              {/* Selected Repo Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border border-[#E5E2DC] rounded-xl shadow-2xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBackToRepos}
                    className="p-1.5 rounded-lg border border-[#D5D0C7] bg-[#FBF9F5] hover:bg-[#EFECE6] text-[#1F1E1D] transition-colors cursor-pointer"
                    title="Back to repository list"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1F1E1D]">
                        {selectedRepo.fullName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedRepo.private ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#736E67]">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-blue-600" />
                        Branch: <strong>{selectedBranch}</strong>
                      </span>
                      <span>•</span>
                      <span>{treeNodes.filter((n) => n.type === 'blob').length} files discovered</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAllVisible(filteredTreeNodes)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#D5D0C7] bg-[#FBF9F5] hover:bg-[#EFECE6] text-[#1F1E1D] transition-colors cursor-pointer"
                  >
                    {filteredTreeNodes.filter((n) => n.type === 'blob').every((n) => selectedPaths.has(n.path))
                      ? 'Deselect All'
                      : 'Select All Visible'}
                  </button>
                  <button
                    onClick={() => fetchRepoTree(selectedRepo, selectedBranch)}
                    disabled={isLoadingTree}
                    className="p-1.5 rounded-lg border border-[#D5D0C7] bg-[#FBF9F5] text-[#736E67] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                    title="Refresh tree"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Tree Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#736E67]" />
                <input
                  type="text"
                  placeholder="Filter files by path or extension (e.g., auth, .ts, payment)..."
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-[#D5D0C7] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1F1E1D]"
                />
              </div>

              {/* File Tree List */}
              {isLoadingTree ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-[#736E67]">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-xs">
                    Calling GitHub Git Trees API for <strong>{selectedRepo.name}@{selectedBranch}</strong>...
                  </span>
                </div>
              ) : treeError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {treeError}
                </div>
              ) : filteredTreeNodes.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#736E67] border border-dashed border-[#D5D0C7] rounded-xl bg-white">
                  No files found matching filter &quot;{treeSearch}&quot;.
                </div>
              ) : (
                <div className="border border-[#E5E2DC] rounded-xl bg-white divide-y divide-[#F0ECE1] max-h-[280px] overflow-y-auto">
                  {filteredTreeNodes
                    .filter((node) => node.type === 'blob')
                    .map((node) => {
                      const isSelected = selectedPaths.has(node.path);
                      const isPreviewing = previewFile?.path === node.path;
                      const formattedSize = node.size
                        ? node.size > 1024
                          ? `${(node.size / 1024).toFixed(1)} KB`
                          : `${node.size} B`
                        : '';

                      return (
                        <div
                          key={node.path}
                          className={`flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70 text-blue-950 font-medium'
                              : 'hover:bg-[#FBF9F5] text-[#1F1E1D]'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectFile(node.path)}
                              className="rounded border-[#D5D0C7] text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-[#736E67]'}`} />
                            <span className="truncate font-mono text-[11px]">{node.path}</span>
                          </label>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {formattedSize && (
                              <span className="text-[10px] text-[#736E67]">{formattedSize}</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewFile(node.path);
                              }}
                              className={`p-1 rounded text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6] transition-colors cursor-pointer ${
                                isPreviewing ? 'bg-[#EFECE6] text-[#1F1E1D]' : ''
                              }`}
                              title="Preview file contents"
                            >
                              {isPreviewing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Inline File Preview */}
              {previewFile && (
                <div className="p-3 bg-[#1F1E1D] text-[#FAF8F5] rounded-xl font-mono text-xs max-h-48 overflow-y-auto border border-black/20">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                    <span className="text-emerald-400 font-semibold">{previewFile.path}</span>
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      Close preview
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed">
                    {previewFile.content || '(File is empty)'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / Action Bar */}
        <div className="px-5 py-3.5 bg-[#FAF8F5] border-t border-[#E5E2DC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#736E67]">
            {selectedRepo ? (
              <span>
                <strong className="text-[#1F1E1D] font-semibold">{selectedPaths.size}</strong>{' '}
                {selectedPaths.size === 1 ? 'file' : 'files'} selected
                {totalSelectedSize > 0 && (
                  <>
                    {' '}
                    (~{(totalSelectedSize / 1024).toFixed(1)} KB, ~
                    {Math.round(totalSelectedSize / 4)} tokens)
                  </>
                )}
              </span>
            ) : (
              <span>Select a repository to explore and attach files</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#736E67] hover:text-[#1F1E1D] hover:bg-[#EFECE6] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {selectedRepo && (
              <button
                onClick={handleAttachSelected}
                disabled={selectedPaths.size === 0 || isAttaching}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1F1E1D] text-white hover:bg-black disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isAttaching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      Pulling {attachProgress?.current}/{attachProgress?.total} ({attachProgress?.filename})...
                    </span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach {selectedPaths.size} {selectedPaths.size === 1 ? 'File' : 'Files'} to Chat</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
