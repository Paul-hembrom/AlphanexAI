import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AI Festa Studio — Next-Gen AI Workspace for Developers & Researchers',
  description: 'Premier AI workspace tailored for developers and researchers in Nepal, fusing Claude minimalist aesthetic, Google AI Studio parameter inspector and code diffs, and multi-mode workflows.',
  openGraph: {
    title: 'AI Festa Studio — Next-Gen AI Workspace for Developers & Researchers',
    description: 'Premier AI workspace tailored for developers and researchers in Nepal, fusing Claude minimalist aesthetic, Google AI Studio parameter inspector and code diffs, and multi-mode workflows.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Festa Studio',
    description: 'Premier AI workspace tailored for developers and researchers in Nepal.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
