'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ANNOUNCE } from '@/lib/config';

export function useAnnouncer() {
  const [message, setMessage] = useState('');
  const state = useRef({
    last: '',
    lastAt: -Infinity,
    queue: [] as string[],
    timers: new Set<ReturnType<typeof setTimeout>>(),
  });
  const announce = useCallback((text: string) => {
    const current = state.current;
    if (text === current.last && Date.now() - current.lastAt < ANNOUNCE.MIN_INTERVAL_MS) return;
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        current.timers.delete(timer);
        callback();
      }, delay);
      current.timers.add(timer);
    };
    const publish = (value: string) => {
      current.last = value;
      current.lastAt = Date.now();
      setMessage('');
      schedule(() => {
        setMessage(value);
      }, 50);
      schedule(() => {
        const next = current.queue.shift();
        if (next !== undefined) publish(next);
      }, ANNOUNCE.MIN_INTERVAL_MS);
    };
    if (Date.now() - current.lastAt < ANNOUNCE.MIN_INTERVAL_MS) {
      current.queue.push(text);
      if (current.queue.length > 2) current.queue.shift();
    } else publish(text);
  }, []);
  useEffect(() => {
    const current = state.current;
    return () => {
      for (const timer of current.timers) clearTimeout(timer);
      current.timers.clear();
    };
  }, []);
  return { message, announce };
}
