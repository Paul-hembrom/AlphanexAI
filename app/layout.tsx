import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Alphanex AI Studio — Frontier Workspace & Research Platform',
  description: 'Alphanex AI Studio: Frontier AI workspace and intelligence platform for developers and researchers, featuring multi-model reasoning, interactive canvas diffs, parameter studio, and grounded workflows.',
  openGraph: {
    title: 'Alphanex AI Studio — Frontier Workspace & Research Platform',
    description: 'Alphanex AI Studio: Frontier AI workspace and intelligence platform for developers and researchers, featuring multi-model reasoning, interactive canvas diffs, parameter studio, and grounded workflows.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alphanex AI Studio',
    description: 'Alphanex AI Studio: Frontier AI workspace and intelligence platform for developers and researchers.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
