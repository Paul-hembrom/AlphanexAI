import React from 'react';
import WebAppPreviewClient from '@/components/preview/WebAppPreviewClient';

interface PreviewPageProps {
  params: Promise<{
    appName: string;
  }>;
}

export async function generateMetadata({ params }: PreviewPageProps) {
  const { appName } = await params;
  const decoded = decodeURIComponent(appName || 'your-app-name');
  return {
    title: `${decoded} — Live Web Preview | AlphanexAI`,
    description: `Interactive live preview build for ${decoded}, connected directly to AlphanexAI Workspace.`,
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { appName } = await params;
  const decoded = decodeURIComponent(appName || 'your-app-name');

  return <WebAppPreviewClient appName={decoded} />;
}
