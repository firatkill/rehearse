'use client';
import { useSyncExternalStore } from 'react';
import { formatSessionTimestamp } from '@/lib/date-time';
const subscribe = () => () => {};
const client = () => true;
const server = () => false;
/** Empty during SSR/hydration; local calendar and clock only after mount. */
export function LocalSessionTime({ value }: { value: string }) {
  const mounted = useSyncExternalStore(subscribe, client, server);
  return <time dateTime={value}>{mounted ? formatSessionTimestamp(value) : null}</time>;
}
