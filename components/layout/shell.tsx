'use client';
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from './header';
import { Footer } from './footer';
import { Banners, type BannerProps } from './banners';
import { LiveRegion } from '@/components/common/live-region';
import { getRepository, useStorageStatus } from '@/hooks/use-repository';
import { useAnnouncer } from '@/hooks/use-announcer';

type ShellApi = {
  message: string;
  announce: (text: string) => void;
  registerEnd: (handler: () => void) => () => void;
};
const ShellContext = createContext<ShellApi>({
  message: '',
  announce: () => {},
  registerEnd: () => () => {},
});
export function useShell() {
  return useContext(ShellContext);
}

export function Shell({
  children,
  room: roomOverride,
  endSession,
  ...banners
}: BannerProps & { children: ReactNode; room?: boolean; endSession?: ReactNode }) {
  const path = usePathname();
  const storage = useStorageStatus();
  useEffect(() => {
    if (path === '/setup' || path === '/history' || path.startsWith('/session/'))
      void getRepository();
  }, [path]);
  const room = roomOverride ?? /^\/session\/[^/]+$/.test(path);
  const { message, announce } = useAnnouncer();
  const [endHandler, setEndHandler] = useState<(() => void) | null>(null);
  const registerEnd = useCallback((handler: () => void) => {
    setEndHandler(() => handler);
    return () => {
      setEndHandler(null);
    };
  }, []);
  const api = useMemo(() => ({ message, announce, registerEnd }), [message, announce, registerEnd]);
  return (
    <ShellContext.Provider value={api}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header
        room={room}
        endSession={
          endSession ?? (
            <Button
              className="min-h-11"
              variant="outline"
              disabled={!endHandler}
              onClick={() => endHandler?.()}
            >
              End session
            </Button>
          )
        }
      />
      <Banners
        {...banners}
        notSaving={banners.notSaving || storage === 'not-saving'}
        updatedElsewhere={banners.updatedElsewhere || storage === 'updated'}
        blocked={banners.blocked || storage === 'blocked'}
      />
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
      {!room && <LiveRegion message={message} />}
      {!room && <Footer />}
    </ShellContext.Provider>
  );
}
