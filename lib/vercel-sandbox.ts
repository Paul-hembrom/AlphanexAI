// =============================================================================
// lib/vercel-sandbox.ts
//
// Thin wrapper around @vercel/sandbox for the research agent.
//
// Vercel Sandbox gives each call its own Firecracker microVM with an
// isolated filesystem, network namespace, and process space. Credentials
// are injected by the network firewall at the boundary, so the VM never
// holds your GitHub / Google / DeepSeek tokens.
//
// When running outside Vercel infrastructure (e.g. local dev / container),
// it gracefully falls back to a deterministic isolated Node VM context.
// =============================================================================

import { Sandbox } from '@vercel/sandbox';
import vm from 'node:vm';

export interface SandboxRunOptions {
  /** Command to execute, e.g. "node" or "python3" */
  cmd: string;
  /** Argument list */
  args?: string[];
  /** Max wall-clock time in ms (default: 2 minutes) */
  timeoutMs?: number;
  /** Files to write into the sandbox before running */
  files?: { path: string; content: string }[];
  /** Working directory inside the sandbox */
  cwd?: string;
  /**
   * Domain allowlist for egress. If omitted, the sandbox gets full internet
   * access for the duration of the run, then is destroyed. Pass an empty
   * array to deny all egress.
   */
  allowedDomains?: string[];
}

export interface SandboxRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  sandboxId: string;
  /** Populated after the sandbox stops */
  cpuMs?: number;
  networkBytes?: { ingress: number; egress: number };
}

/**
 * Default network policy for research-agent sandboxes.
 */
export function defaultAllowedDomains(): string[] {
  return [
    'api.github.com',
    'github.com',
    '*.githubusercontent.com',
    'gmailmcp.googleapis.com',
    'docs.googleapis.com',
    'www.googleapis.com',
    'oauth2.googleapis.com',
    'api.deepseek.com',
  ];
}

/**
 * Run a command inside a fresh Vercel Sandbox, with graceful local fallback.
 */
export async function runInSandbox(
  options: SandboxRunOptions
): Promise<SandboxRunResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;

  try {
    const sandbox = await Sandbox.create({
      timeout: timeoutMs,
      runtime: 'node24',
      networkPolicy: (options.allowedDomains === undefined
        ? 'allow-all'
        : options.allowedDomains.length === 0
        ? 'deny-all'
        : {
            allow: Object.fromEntries(
              options.allowedDomains.map((domain) => {
                const rule: Record<string, unknown> = {};
                if (domain === 'api.github.com' && process.env.GITHUB_TOKEN) {
                  rule.transform = [
                    { headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } },
                  ];
                }
                if (
                  domain.endsWith('googleapis.com') &&
                  process.env.GMAIL_MCP_TOKEN
                ) {
                  rule.transform = [
                    { headers: { authorization: `Bearer ${process.env.GMAIL_MCP_TOKEN}` } },
                  ];
                }
                if (domain === 'api.deepseek.com' && process.env.DEEPSEEK_API_KEY) {
                  rule.transform = [
                    { headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` } },
                  ];
                }
                return [domain, [rule]];
              })
            ),
          }) as any,
    });

    try {
      if (options.files?.length) {
        await sandbox.writeFiles(
          options.files.map((f) => ({
            path: f.path,
            content: Buffer.from(f.content, 'utf-8'),
          }))
        );
      }

      const result = await sandbox.runCommand(
        options.cmd,
        options.args ?? [],
        options.cwd ? ({ cwd: options.cwd } as any) : undefined
      );

      const cpuMs = (sandbox as any).activeCpuUsageMs;
      const networkBytes = (sandbox as any).networkUsage;

      return {
        exitCode: result.exitCode,
        stdout: await result.stdout(),
        stderr: await result.stderr(),
        sandboxId: (sandbox as any).sandboxId ?? (sandbox as any).id ?? 'sandbox-vm',
        cpuMs,
        networkBytes,
      };
    } finally {
      await sandbox.stop();
    }
  } catch (vercelError) {
    // Graceful fallback to isolated node:vm execution
    console.info('ℹ️ Vercel Sandbox unavailable; executing in isolated Node VM context.');
    const stdoutArr: string[] = [];
    const stderrArr: string[] = [];

    const scriptFile = options.files?.[0]?.content || '';
    const sandboxContext = vm.createContext({
      console: {
        log: (...args: unknown[]) => stdoutArr.push(args.map(String).join(' ')),
        error: (...args: unknown[]) => stderrArr.push(args.map(String).join(' ')),
        warn: (...args: unknown[]) => stderrArr.push(args.map(String).join(' ')),
      },
      Math,
      Date,
      JSON,
      Intl,
      Buffer,
      setTimeout,
      clearTimeout,
      daysBetween: (a: string | Date, b: string | Date) =>
        Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000),
      monthsBetween: (a: string | Date, b: string | Date) => {
        const d1 = new Date(a);
        const d2 = new Date(b);
        return Math.abs((d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
      },
      sum: (arr: number[]) => arr.reduce((acc, v) => acc + (Number(v) || 0), 0),
      round: (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d,
    });

    try {
      const script = new vm.Script(scriptFile);
      script.runInContext(sandboxContext, { timeout: Math.min(timeoutMs, 10_000) });
      return {
        exitCode: 0,
        stdout: stdoutArr.join('\n'),
        stderr: stderrArr.join('\n'),
        sandboxId: 'local-vm-fallback',
      };
    } catch (err) {
      return {
        exitCode: 1,
        stdout: stdoutArr.join('\n'),
        stderr: (err as Error).message + (stderrArr.length ? '\n' + stderrArr.join('\n') : ''),
        sandboxId: 'local-vm-fallback',
      };
    }
  }
}

/**
 * Higher-level helper: execute a JavaScript snippet inside the sandbox and
 * return its stdout.
 */
export async function runJsInSandbox(
  code: string,
  timeoutMs = 60_000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const wrapped = `(async () => {${code}})().catch((err) => {
    console.error(err && err.stack ? err.stack : String(err));
  });`;

  const result = await runInSandbox({
    cmd: 'node',
    args: ['/tmp/agent-script.js'],
    timeoutMs,
    files: [{ path: '/tmp/agent-script.js', content: wrapped }],
    allowedDomains: defaultAllowedDomains(),
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}
