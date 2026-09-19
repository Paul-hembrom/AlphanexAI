import { slugifyAppName } from './webapp-shared';

export interface DeployFile {
  path: string;
  content: string;
}

export interface VercelDeployResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  readyState?: string;
  error?: string;
  status?: string;
}

export interface VercelDomainResult {
  success: boolean;
  domain?: string;
  verification?: any[];
  configured?: boolean;
  error?: string;
}

/**
 * Creates a public live deployment via the Vercel REST Deployments API (v13).
 * Uses VERCEL_TOKEN (personal or team token).
 */
export async function deployToVercel(
  appName: string,
  files: DeployFile[]
): Promise<VercelDeployResult> {
  const token = process.env.VERCEL_TOKEN;

  if (!token || !token.trim()) {
    return {
      success: false,
      error:
        'VERCEL_TOKEN is not configured in the environment. To deploy live to a public URL, create an access token at https://vercel.com/account/tokens and configure VERCEL_TOKEN in Settings.',
      status: 'missing_token',
    };
  }

  if (!files || files.length === 0) {
    return {
      success: false,
      error: 'No files provided for deployment.',
      status: 'invalid_files',
    };
  }

  const cleanName = slugifyAppName(appName);

  // Prepare files using Base64 encoding as required by Vercel v13 REST API
  const preparedFiles = files.map((f) => {
    let filePath = f.path.replace(/^\/+/, '');
    return {
      file: filePath,
      data: Buffer.from(f.content, 'utf-8').toString('base64'),
      encoding: 'base64' as const,
    };
  });

  // Ensure index.html exists as the root entry point
  const hasIndex = preparedFiles.some((f) => f.file === 'index.html');
  if (!hasIndex && preparedFiles.length === 1) {
    preparedFiles[0].file = 'index.html';
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const endpoint = teamId
    ? `https://api.vercel.com/v13/deployments?teamId=${encodeURIComponent(teamId)}`
    : `https://api.vercel.com/v13/deployments`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanName,
        files: preparedFiles,
        projectSettings: {
          framework: null,
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        `Vercel API returned status ${response.status} (${response.statusText})`;
      return {
        success: false,
        error: errMsg,
        status: 'error',
      };
    }

    if (!data || !data.url) {
      return {
        success: false,
        error: 'Vercel API response did not contain a valid deployment URL.',
        status: 'error',
      };
    }

    const liveUrl = data.url.startsWith('http') ? data.url : `https://${data.url}`;

    return {
      success: true,
      url: liveUrl,
      deploymentId: data.id,
      readyState: data.readyState || 'READY',
      status: 'ready',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to communicate with Vercel API: ${message}`,
      status: 'error',
    };
  }
}

/**
 * Attaches a custom domain to a Vercel project using the Vercel Projects API (v10).
 */
export async function attachDomainToVercel(
  appName: string,
  domain: string
): Promise<VercelDomainResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token || !token.trim()) {
    return {
      success: false,
      error:
        'VERCEL_TOKEN is not configured. Add your Vercel token in settings to attach custom domains.',
    };
  }

  const cleanName = slugifyAppName(appName);
  const teamId = process.env.VERCEL_TEAM_ID;
  const endpoint = teamId
    ? `https://api.vercel.com/v10/projects/${encodeURIComponent(cleanName)}/domains?teamId=${encodeURIComponent(teamId)}`
    : `https://api.vercel.com/v10/projects/${encodeURIComponent(cleanName)}/domains`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain.trim() }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        `Failed to attach domain (${response.status} ${response.statusText})`;
      return {
        success: false,
        error: errMsg,
      };
    }

    return {
      success: true,
      domain: data.name || domain,
      verification: data.verification,
      configured: data.configured,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Domain attachment network error: ${message}`,
    };
  }
}
