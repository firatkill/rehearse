import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

export function Header({ room = false, endSession }: { room?: boolean; endSession?: ReactNode }) {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="wordmark" href="/">
          Rehearse
        </Link>
        {room ? (
          endSession
        ) : (
          <>
            <nav aria-label="Main navigation">
              <Link href="/setup">Practise</Link>
              <Link href="/sample">Sample report</Link>
              <Link href="/history">History</Link>
              <Link href="/how-it-works">How it works</Link>
              <a href="https://github.com/firatkill/rehearse">GitHub</a>
            </nav>
            <ThemeToggle />
          </>
        )}
      </div>
    </header>
  );
}
