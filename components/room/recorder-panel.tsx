'use client';
import { useEffect, useRef, useState } from 'react';
import { ANNOUNCE, SESSION } from '@/lib/config';
import type { TranscriptState } from '@/lib/speech/transcript';
import { SafeText } from '@/components/common/safe-text';
import { TimerDisplay } from '@/components/common/timer-display';
import { Button } from '@/components/ui/button';
export function RecorderPanel({
  transcript,
  startedAt,
  limit,
  announce,
  onStop,
  onLimit,
}: {
  transcript: TranscriptState;
  startedAt: number;
  limit: number;
  announce: (text: string) => void;
  onStop: () => void;
  onLimit: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const callbacks = useRef({ announce, onLimit });
  useEffect(() => {
    callbacks.current = { announce, onLimit };
  }, [announce, onLimit]);
  useEffect(() => {
    const offset = Date.now() - startedAt;
    const began = performance.now();
    const announced = new Set<number>();
    let stopped = false;
    const timer = setInterval(() => {
      const ms = offset + performance.now() - began;
      setElapsed(Math.min(ms, limit * 1000));
      for (const threshold of ANNOUNCE.RECORDING_REMAINING_S) {
        if (threshold < limit && ms >= (limit - threshold) * 1000 && !announced.has(threshold)) {
          announced.add(threshold);
          callbacks.current.announce(
            threshold === 60 ? '1 minute left.' : `${threshold} seconds left.`,
          );
        }
      }
      if (ms >= limit * 1000 && !stopped) {
        stopped = true;
        callbacks.current.onLimit();
      }
    }, SESSION.TIMER_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [startedAt, limit]);
  const final = [transcript.committed, transcript.runFinal].filter(Boolean).join(' ');
  return (
    <section className="space-y-4">
      <p className="text-warn">
        <span aria-hidden="true">● </span>Recording
      </p>
      <p aria-hidden="true">
        <TimerDisplay ms={elapsed} /> / <TimerDisplay ms={limit * 1000} />
      </p>
      <section aria-labelledby="live-transcript" aria-live="off">
        <h2 id="live-transcript">Live transcript</h2>
        {!final && !transcript.runInterim ? (
          <p>Start speaking. Your words will appear here.</p>
        ) : (
          <p>
            <SafeText text={final} />
            {final && transcript.runInterim ? ' ' : ''}
            <span className="text-ink-3 italic" aria-hidden="true">
              <SafeText text={transcript.runInterim} />
            </span>
          </p>
        )}
      </section>
      <p>Speak naturally. You can fix any misheard words before you submit.</p>
      <Button data-phase-focus onClick={onStop}>
        Stop and review
      </Button>
    </section>
  );
}
