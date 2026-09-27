import { getUserConnection } from './user-connections';
export interface GitHubPRRequest {
  repoUrl?: string;
  targetBranch?: string;
  featureBranch?: string;
  prTitle?: string;
  prBody?: string;
  patchCode?: string;
  filename?: string;
}

export interface GitHubActionResult {
  success: boolean;
  action: string;
  prUrl?: string;
  prNumber?: number;
  branch?: string;
  repo?: string;
  data?: unknown;
  message?: string;
  tokenSource?: string;
  needsAuth?: boolean;
  status?: number;
  error?: string;
  details?: unknown;
  stats?: {
    additions: number;
    deletions: number;
    changedFiles: number;
  };
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  url: string;
  private: boolean;
  defaultBranch: string;
  description: string;
  updatedAt: string;
  stargazersCount: number;
  language: string;
}

export interface GitHubTreeNode {
  path: string;
  mode?: string;
  type: 'blob' | 'tree';
  sha?: string;
  size?: number;
  url?: string;
}

/**
 * Extracts { owner, repo } from parameters or a GitHub URL.
 * Never defaults to fake nepal-devs/fintech-core.
 */
export function parseOwnerAndRepo(params: Record<string, unknown>): { owner: string; repo: string } | null {
  const ownerParam = typeof params.owner === 'string' ? params.owner.trim() : '';
  const repoParam = typeof params.repo === 'string' ? params.repo.trim() : '';

  if (ownerParam && repoParam) {
    return { owner: ownerParam, repo: repoParam.replace(/\.git$/, '') };
  }

  const urlCandidate = (params.repoUrl || params.url || params.repository || '') as string;
  if (urlCandidate && typeof urlCandidate === 'string') {
    const cleanUrl = urlCandidate.replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2] };
    }
    const shortMatch = cleanUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shortMatch && shortMatch[1] && shortMatch[2]) {
      return { owner: shortMatch[1], repo: shortMatch[2] };
    }
  }

  return null;
}

/**
 * Resolves a GitHub token strictly per-user first, falling back to process.env.GITHUB_TOKEN
 * only as an admin fallback if configured, clearly labeled.
 */
export async function resolveGitHubToken(userId: string): Promise<{
  token: string | null;
  tokenSource: string;
  isUserToken: boolean;
}> {
  if (userId && !userId.startsWith('usr_guest') && userId !== 'guest-default') {
    const userConn = await getUserConnection(userId, 'github');
    if (userConn?.accessToken) {
      return {
        token: userConn.accessToken,
        tokenSource: `User OAuth (@${userConn.accountUsername || 'authorized'})`,
        isUserToken: true,
      };
    }
  }

  const adminToken = process.env.GITHUB_TOKEN;
  if (adminToken && adminToken.trim()) {
    return {
      token: adminToken.trim(),
      tokenSource: 'Admin fallback env (GITHUB_TOKEN)',
      isUserToken: false,
    };
  }

  return {
    token: null,
    tokenSource: 'None',
    isUserToken: false,
  };
}

/**
 * Executes a GitHub action against the live GitHub REST API.
 * Never returns fabricated repositories, fake PR numbers, or fake file trees.
 */
export async function executeGitHubAction(
  action: 'create_pull_request' | 'search_code' | 'list_repos' | 'get_file_contents' | 'get_repo_tree',
  params: Record<string, unknown> = {},
  userId: string
): Promise<GitHubActionResult> {
  const { token, tokenSource } = await resolveGitHubToken(userId);

  if (!token) {
    return {
      success: false,
      action,
      tokenSource,
      needsAuth: true,
      error: 'GitHub is not connected. Connect OAuth with repo scope or paste a Personal Access Token.',
      message: 'GitHub is not connected. Connect OAuth with repo scope or paste a Personal Access Token.',
    };
  }

  const defaultHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'AlphanexAI-GitHub-Connector',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 1. LIST REPOSITORIES
  if (action === 'list_repos') {
    try {
      const res = await fetch(
        'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member',
        {
          headers: defaultHeaders,
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let humanMsg = `GitHub API error (${res.status}): ${res.statusText}`;
        if (res.status === 401) {
          humanMsg = 'GitHub token is invalid or has expired. Please reconnect your account.';
        } else if (res.status === 403) {
          humanMsg = 'GitHub API rate limit exceeded or token lacks required scopes (repo).';
        }

        return {
          success: false,
          action,
          tokenSource,
          status: res.status,
          error: humanMsg,
          message: humanMsg,
          details: errorText,
        };
      }

      const repos = await res.json();
      if (!Array.isArray(repos)) {
        return {
          success: false,
          action,
          tokenSource,
          error: 'Unexpected response format from GitHub API.',
          message: 'Unexpected response format from GitHub API.',
        };
      }

      const mapped: GitHubRepo[] = repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner?.login || (r.full_name ? r.full_name.split('/')[0] : 'unknown'),
        url: r.html_url,
        private: Boolean(r.private),
        defaultBranch: r.default_branch || 'main',
        description: r.description || '',
        updatedAt: r.updated_at,
        stargazersCount: r.stargazers_count ?? 0,
        language: r.language || 'Code',
      }));

      return {
        success: true,
        action,
        tokenSource,
        data: mapped,
        message: `Retrieved ${mapped.length} live repositories from GitHub (${tokenSource}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        action,
        tokenSource,
        error: `Network error connecting to GitHub: ${err?.message || err}`,
        message: `Network error connecting to GitHub: ${err?.message || err}`,
      };
    }
  }

  // 2. GET REPOSITORY TREE
  if (action === 'get_repo_tree') {
    const target = parseOwnerAndRepo(params);
    if (!target) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'Repository owner and name are required (e.g. owner/repo).',
        message: 'Repository owner and name are required (e.g. owner/repo).',
      };
    }

    const branch = (params.branch as string) || (params.ref as string) || 'main';

    try {
      const treeUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
        target.repo
      )}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

      const res = await fetch(treeUrl, {
        headers: defaultHeaders,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let humanMsg = `GitHub API error (${res.status}) fetching tree for ${target.owner}/${target.repo}@${branch}`;
        if (res.status === 404) {
          humanMsg = `Repository or branch not found on GitHub: ${target.owner}/${target.repo}@${branch}. Ensure the repository exists and your token has permission to access it.`;
        } else if (res.status === 401) {
          humanMsg = 'GitHub token is invalid or expired. Re-authenticate to access this repository.';
        } else if (res.status === 403) {
          humanMsg = 'GitHub rate limit exceeded or access forbidden for this repository.';
        }

        return {
          success: false,
          action,
          tokenSource,
          status: res.status,
          error: humanMsg,
          message: humanMsg,
          details: errorText,
        };
      }

      const treeData = await res.json();
      const rawTree = Array.isArray(treeData.tree) ? treeData.tree : [];
      const treeNodes: GitHubTreeNode[] = rawTree.map((node: any) => ({
        path: node.path,
        mode: node.mode,
        type: node.type === 'tree' ? 'tree' : 'blob',
        sha: node.sha,
        size: node.size,
        url: node.url,
      }));

      return {
        success: true,
        action,
        tokenSource,
        data: {
          owner: target.owner,
          repo: target.repo,
          branch,
          sha: treeData.sha,
          tree: treeNodes,
          truncated: Boolean(treeData.truncated),
        },
        message: `Retrieved ${treeNodes.length} repository tree items for ${target.owner}/${target.repo}@${branch} (${tokenSource}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        action,
        tokenSource,
        error: `Failed to fetch repository tree: ${err?.message || err}`,
        message: `Failed to fetch repository tree: ${err?.message || err}`,
      };
    }
  }

  // 3. GET FILE CONTENTS
  if (action === 'get_file_contents') {
    const target = parseOwnerAndRepo(params);
    if (!target) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'Repository owner and name are required.',
        message: 'Repository owner and name are required.',
      };
    }

    const filePath = (params.path as string) || '';
    if (!filePath) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'File path within repository is required.',
        message: 'File path within repository is required.',
      };
    }

    const ref = (params.ref as string) || (params.branch as string) || '';
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';

    // Encode path segments while preserving slashes
    const cleanPath = filePath.split('/').map(encodeURIComponent).join('/');
    const contentUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
      target.repo
    )}/contents/${cleanPath}${query}`;

    try {
      const res = await fetch(contentUrl, {
        headers: defaultHeaders,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let humanMsg = `GitHub API error (${res.status}) reading ${filePath}`;
        if (res.status === 404) {
          humanMsg = `File not found in ${target.owner}/${target.repo}: ${filePath}`;
        } else if (res.status === 401) {
          humanMsg = 'GitHub token is invalid or expired.';
        } else if (res.status === 403) {
          humanMsg = 'Permission denied reading file on GitHub.';
        }

        return {
          success: false,
          action,
          tokenSource,
          status: res.status,
          error: humanMsg,
          message: humanMsg,
          details: errText,
        };
      }

      const fileData = await res.json();
      let content = '';

      if (fileData.content) {
        content = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf-8');
      } else if (fileData.download_url) {
        const dlRes = await fetch(fileData.download_url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'AlphanexAI-GitHub-Connector',
          },
        });
        if (dlRes.ok) {
          content = await dlRes.text();
        } else {
          return {
            success: false,
            action,
            tokenSource,
            error: `Failed to download file content from ${fileData.download_url}`,
            message: `Failed to download file content from ${fileData.download_url}`,
          };
        }
      }

      return {
        success: true,
        action,
        tokenSource,
        data: {
          path: filePath,
          content,
          size: fileData.size ?? content.length,
          owner: target.owner,
          repo: target.repo,
          branch: ref || 'default',
        },
        message: `Retrieved live contents of ${filePath} from ${target.owner}/${target.repo} (${tokenSource}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        action,
        tokenSource,
        error: `Error retrieving file contents: ${err?.message || err}`,
        message: `Error retrieving file contents: ${err?.message || err}`,
      };
    }
  }

  // 4. SEARCH CODE
  if (action === 'search_code') {
    const query = (params.query as string) || '';
    if (!query.trim()) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'Search query is required.',
        message: 'Search query is required.',
      };
    }

    try {
      const searchRes = await fetch(
        `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=20`,
        {
          headers: defaultHeaders,
          cache: 'no-store',
        }
      );

      if (!searchRes.ok) {
        const errText = await searchRes.text().catch(() => '');
        let humanMsg = `GitHub code search error (${searchRes.status})`;
        if (searchRes.status === 403) {
          humanMsg = 'GitHub search rate limit exceeded or query forbidden.';
        } else if (searchRes.status === 401) {
          humanMsg = 'GitHub token is invalid or expired.';
        }

        return {
          success: false,
          action,
          tokenSource,
          status: searchRes.status,
          error: humanMsg,
          message: humanMsg,
          details: errText,
        };
      }

      const searchData = await searchRes.json();
      return {
        success: true,
        action,
        tokenSource,
        data: searchData.items || [],
        message: `Found ${searchData.total_count ?? 0} live code matches on GitHub for '${query}' (${tokenSource}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        action,
        tokenSource,
        error: `Code search failed: ${err?.message || err}`,
        message: `Code search failed: ${err?.message || err}`,
      };
    }
  }

  // 5. CREATE PULL REQUEST
  if (action === 'create_pull_request') {
    const prParams = params as unknown as GitHubPRRequest;
    const target = parseOwnerAndRepo(params);
    if (!target) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'Target repository (owner/repo or repoUrl) is required to create a Pull Request.',
        message: 'Target repository (owner/repo or repoUrl) is required to create a Pull Request.',
      };
    }

    const targetBranch = prParams.targetBranch || 'main';
    const featureBranch = prParams.featureBranch || '';
    const prTitle = prParams.prTitle || '';
    const prBody = prParams.prBody || '';

    if (!featureBranch) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'Feature branch name (head) is required to create a Pull Request.',
        message: 'Feature branch name (head) is required to create a Pull Request.',
      };
    }

    if (!prTitle) {
      return {
        success: false,
        action,
        tokenSource,
        error: 'Pull request title is required.',
        message: 'Pull request title is required.',
      };
    }

    try {
      const prRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(
          target.repo
        )}/pulls`,
        {
          method: 'POST',
          headers: {
            ...defaultHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: prTitle,
            head: featureBranch,
            base: targetBranch,
            body: `${prBody}\n\n---\n*Created via Alphanex AI Studio (${tokenSource}).*`,
          }),
        }
      );

      if (!prRes.ok) {
        const errJson = await prRes.json().catch(() => ({}));
        const rawMsg = errJson.message || (await prRes.text().catch(() => ''));
        let humanMsg = `GitHub refused Pull Request creation (${prRes.status}): ${rawMsg}`;

        if (prRes.status === 422) {
          humanMsg = `Cannot create PR: ${rawMsg}. Ensure branch '${featureBranch}' exists and has commits not already in '${targetBranch}'.`;
        } else if (prRes.status === 404) {
          humanMsg = `Repository ${target.owner}/${target.repo} not found or token lacks write access.`;
        } else if (prRes.status === 401) {
          humanMsg = 'GitHub token unauthorized or expired.';
        }

        return {
          success: false,
          action,
          tokenSource,
          status: prRes.status,
          error: humanMsg,
          message: humanMsg,
          details: errJson,
        };
      }

      const prData = await prRes.json();
      return {
        success: true,
        action,
        prUrl: prData.html_url,
        prNumber: prData.number,
        branch: featureBranch,
        repo: `${target.owner}/${target.repo}`,
        data: prData,
        tokenSource,
        message: `Pull Request #${prData.number} successfully created on GitHub (${tokenSource})!`,
        stats: {
          additions: prData.additions ?? (prParams.patchCode ? prParams.patchCode.split('\n').length : 0),
          deletions: prData.deletions ?? 0,
          changedFiles: prData.changed_files ?? 1,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        action,
        tokenSource,
        error: `Failed to create Pull Request: ${err?.message || err}`,
        message: `Failed to create Pull Request: ${err?.message || err}`,
      };
    }
  }

  return {
    success: false,
    action,
    tokenSource,
    error: `Unknown action: ${action}`,
    message: `Unknown action: ${action}`,
  };
}
