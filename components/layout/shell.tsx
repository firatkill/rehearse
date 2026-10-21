'use client';
import type { ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { Banners, type BannerProps } from './banners';
import { LiveRegion } from '@/components/common/live-region';
import { useAnnouncer } from '@/hooks/use-announcer';

export function Shell({
  children,
  room = false,
  endSession,
  ...banners
}: BannerProps & { children: ReactNode; room?: boolean; endSession?: ReactNode }) {
  const { message } = useAnnouncer();
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header room={room} endSession={endSession} />
      <Banners {...banners} />
      <noscript>
        Rehearse needs JavaScript for the interview room. The sample report and the write-up work
        without it.
      </noscript>
      <main
        id="main-content"
        tabIndex={-1}
        className={room ? 'room-column container' : 'container'}
      >
        {children}
      </main>
      <LiveRegion message={message} />
      {!room && <Footer />}
    </>
  );
}
