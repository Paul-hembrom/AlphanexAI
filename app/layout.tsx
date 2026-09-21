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
  const supabaseUrl = process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_PUBLIC_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  return (
    <html lang="en">
      <head>
        {supabaseUrl && supabaseAnonKey && (
          <script
            id="supabase-public-config"
            dangerouslySetInnerHTML={{
              __html: `window.__SUPABASE_PUBLIC_URL__=${JSON.stringify(supabaseUrl)};window.__SUPABASE_PUBLIC_ANON_KEY__=${JSON.stringify(supabaseAnonKey)};`,
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
