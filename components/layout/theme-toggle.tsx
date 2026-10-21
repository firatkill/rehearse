'use client';
import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

function subscribe(listener: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  media.addEventListener('change', listener);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', listener);
  };
}
function snapshot() {
  const theme = document.documentElement.dataset.theme;
  return (
    theme === 'dark' ||
    (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const theme = dark ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem('rehearse-theme', theme);
        } catch {
          /* Theme remains available when storage is blocked. */
        }
      }}
    >
      {dark ? <Sun aria-hidden="true" size={20} /> : <Moon aria-hidden="true" size={20} />}
    </button>
  );
}
