'use client';
import { T } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
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
            <T id="components.layout.banners.1" />{' '}
            <Link href="/sample">
              <T id="components.layout.banners.2" />
            </Link>
          </div>
        )}
      </div>
      <div role="status">
        {mounted && demoMode === 'off' && (
          <div className="banner container">
            <T id="components.layout.banners.3" />
          </div>
        )}
      </div>
      <div role="status">
        {mounted && !online && (
          <div className="banner container">
            <T id="components.layout.banners.4" />
          </div>
        )}
      </div>
      <div role="status">
        {mounted && notSaving && (
          <div className="banner container">
            <T id="components.layout.banners.5" />
          </div>
        )}
      </div>
      <div role="status">
        {mounted && updatedElsewhere && (
          <div className="banner container">
            <T id="components.layout.banners.6" />{' '}
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              <T id="components.layout.banners.7" />
            </button>
          </div>
        )}
      </div>
      <div role="status">
        {mounted && blocked && (
          <div className="banner container">
            <T id="components.layout.banners.8" />
          </div>
        )}
      </div>
    </div>
  );
}
