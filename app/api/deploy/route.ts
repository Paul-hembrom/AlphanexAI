import { NextRequest, NextResponse } from 'next/server';
import { deployToVercel, attachDomainToVercel, DeployFile } from '@/lib/vercel-deploy';

export const maxDuration = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appName, html, files, pages, action, domain } = body;

    if (!appName) {
      return NextResponse.json(
        { success: false, error: 'appName is required for deployment.', status: 'invalid_request' },
        { status: 400 }
      );
    }

    // Handle domain attachment action
    if (action === 'domain') {
      if (!domain || typeof domain !== 'string') {
        return NextResponse.json(
          { success: false, error: 'domain is required for domain configuration.' },
          { status: 400 }
        );
      }
      const domainResult = await attachDomainToVercel(appName, domain);
      if (!domainResult.success) {
        return NextResponse.json(
          { success: false, error: domainResult.error },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        domain: domainResult.domain,
        verification: domainResult.verification,
        configured: domainResult.configured,
      });
    }

    // Handle deployment
    let deployFiles: DeployFile[] = [];

    if (Array.isArray(files) && files.length > 0) {
      deployFiles = files;
    } else if (Array.isArray(pages) && pages.length > 0) {
      deployFiles = pages.map((p: { path?: string; html?: string }) => ({
        path: p.path || 'index.html',
        content: p.html || '',
      }));
    } else if (html && typeof html === 'string') {
      deployFiles = [{ path: 'index.html', content: html }];
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either html or files array must be provided for deployment.',
          status: 'invalid_request',
        },
        { status: 400 }
      );
    }

    const deployResult = await deployToVercel(appName, deployFiles);

    if (!deployResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deployResult.error,
          status: deployResult.status || 'error',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: deployResult.url,
      status: deployResult.status || 'ready',
      deploymentId: deployResult.deploymentId,
      readyState: deployResult.readyState,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Deployment server exception: ${message}`, status: 'server_error' },
      { status: 500 }
    );
  }
}
