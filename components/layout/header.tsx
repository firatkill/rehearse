import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

export function Header({ room = false, endSession }: { room?: boolean; endSession?: ReactNode }) {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="wordmark" href="/">
          <span className="wordmark-dot" aria-hidden="true" />
          Rehearse
        </Link>
        {room ? (
          endSession
        ) : (
          <>
            <nav aria-label="Main navigation">
              <Link href="/setup">Practise</Link>
              <Link href="/setup#job-post">Job post</Link>
              <Link href="/progress">Progress</Link>
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
