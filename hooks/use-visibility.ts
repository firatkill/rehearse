'use client';
import { useEffect } from 'react';
export function useVisibility(onChange: (hidden: boolean) => void) {
  useEffect(() => {
    const handle = () => {
      onChange(document.hidden);
    };
    document.addEventListener('visibilitychange', handle);
    return () => {
      document.removeEventListener('visibilitychange', handle);
    };
  }, [onChange]);
}
