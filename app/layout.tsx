import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Schibsted_Grotesk, JetBrains_Mono } from 'next/font/google';
import type { Viewport } from 'next';
import { getEnv } from '@/lib/env';
import { Shell } from '@/components/layout/shell';
import './globals.css';
import './print.css';

const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-schibsted',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
});
const THEME_SCRIPT = `try {
  const t = localStorage.getItem('rehearse-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch {}`;
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* eslint-disable-next-line react/no-danger -- constant theme script, TRD §19.3 */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Shell demoMode={getEnv().DEMO_MODE}>{children}</Shell>
      </body>
    </html>
  );
}
