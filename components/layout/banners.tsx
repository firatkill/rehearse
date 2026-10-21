'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}
function subscribeMount() {
  return () => {};
}
export type BannerProps = {
  demoMode: 'on' | 'readonly' | 'off';
  notSaving?: boolean;
  updatedElsewhere?: boolean;
  blocked?: boolean;
};
export function Banners({
  demoMode,
  notSaving = false,
  updatedElsewhere = false,
  blocked = false,
}: BannerProps) {
  const mounted = useSyncExternalStore(
    subscribeMount,
    () => true,
    () => false,
  );
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  return (
    <div className="banners">
      <div role="status">
        {mounted && demoMode === 'readonly' && (
          <div className="banner container">
            Feedback is paused on the live demo. You can still practise with voice or text, and the
            sample report shows what feedback looks like.{' '}
            <Link href="/sample">See the sample report</Link>
          </div>
        )}
      </div>
      <div role="status">
        {mounted && demoMode === 'off' && (
          <div className="banner container">
            The practice room is offline for maintenance. Your saved sessions, the sample report and
            the write-up are still available.
          </div>
        )}
      </div>
      <div role="status">
        {mounted && !online && (
          <div className="banner container">
            You’re offline. You can keep answering; feedback needs a connection.
          </div>
        )}
      </div>
      <div role="status">
        {mounted && notSaving && (
          <div className="banner container">
            This browser isn’t saving sessions, so they will be lost when you close the tab. Private
            windows in some browsers block storage.
          </div>
        )}
      </div>
      <div role="status">
        {mounted && updatedElsewhere && (
          <div className="banner container">
            Rehearse was updated in another tab. Reload this page to keep saving.{' '}
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        )}
      </div>
      <div role="status">
        {mounted && blocked && (
          <div className="banner container">Close other Rehearse tabs, then reload this page.</div>
        )}
      </div>
    </div>
  );
}
