'use client';
import { T, useT } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

export function Header({ room = false, endSession }: { room?: boolean; endSession?: ReactNode }) {
  const t = useT();

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="wordmark" href="/">
          <span className="wordmark-dot" aria-hidden="true" />
          <T id="components.layout.header.1" />
        </Link>
        {room ? (
          endSession
        ) : (
          <>
            <nav aria-label={t('ui.dynamic.40')}>
              <Link href="/setup">
                <T id="components.layout.header.2" />
              </Link>
              <Link href="/setup#job-post">
                <T id="components.layout.header.3" />
              </Link>
              <Link href="/progress">
                <T id="components.history.history.list.13" />
              </Link>
              <Link href="/how-it-works">
                <T id="components.layout.header.5" />
              </Link>
              <a className="header-github" href="https://github.com/firatkill/rehearse">
                <T id="components.layout.header.6" />
              </a>
            </nav>
            <ThemeToggle />
          </>
        )}
      </div>
    </header>
  );
}
