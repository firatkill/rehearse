import { CameraProvider } from '@/lib/camera/context';
import { SpeechProvider } from '@/lib/speech/provider-context';
import { I18nProvider } from '@/lib/i18n/context';
import { loadMessages } from '@/lib/i18n/messages';
import { requestLanguage } from '@/lib/i18n/server';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Schibsted_Grotesk, JetBrains_Mono } from 'next/font/google';
import type { Viewport } from 'next';
import { getEnv } from '@/lib/env';
import { Shell } from '@/components/layout/shell';
import { getMonthlyBudget } from '@/lib/cost/budget';
import type { BudgetLevel } from '@/lib/api/budget-contract';
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
    { media: '(prefers-color-scheme: light)', color: '#f2f4f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1412' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  const language = await requestLanguage();
  const messages = await loadMessages(language);
  const env = getEnv();
  let initialBudgetLevel: BudgetLevel = 'none';
  if (env.APP_EDITION === 'full') {
    try {
      initialBudgetLevel = getMonthlyBudget().level;
    } catch {
      /* Budget warnings never block pages. */
    }
  }
  return (
    <html lang={language} suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* eslint-disable-next-line react/no-danger -- constant theme script, TRD §19.3 */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <I18nProvider initialLanguage={language} initialMessages={messages}>
          <CameraProvider>
            <SpeechProvider enabled={env.APP_EDITION === 'full' && env.TTS_PROVIDER !== 'browser'}>
              <Shell
                demoMode={env.DEMO_MODE}
                edition={env.APP_EDITION}
                initialBudgetLevel={initialBudgetLevel}
              >
                {children}
              </Shell>
            </SpeechProvider>
          </CameraProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
