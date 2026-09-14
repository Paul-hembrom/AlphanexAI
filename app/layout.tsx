import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AI Festa Studio — AlphanexAI Frontier Workspace & Research Platform',
  description: 'AlphanexAI: Frontier AI workspace and intelligence platform for developers and researchers, featuring multi-model reasoning, interactive canvas diffs, parameter studio, and grounded workflows.',
  openGraph: {
    title: 'AI Festa Studio — AlphanexAI Frontier Workspace & Research Platform',
    description: 'AlphanexAI: Frontier AI workspace and intelligence platform for developers and researchers, featuring multi-model reasoning, interactive canvas diffs, parameter studio, and grounded workflows.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Festa Studio — AlphanexAI',
    description: 'AlphanexAI: Frontier AI workspace and intelligence platform for developers and researchers.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
