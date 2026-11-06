'use client';
import { durationWords } from '@/lib/i18n/duration';
import { T, useT } from '@/lib/i18n/context';
import { useEffect, useRef, useState } from 'react';
import { formatMmSs } from '@/lib/time';
import { ANNOUNCE, SESSION, RECORDING_GUIDE } from '@/lib/config';
import type { TranscriptState } from '@/lib/speech/transcript';
import { SafeText } from '@/components/common/safe-text';
import { TimerDisplay } from '@/components/common/timer-display';
import { Button } from '@/components/ui/button';
export function RecorderPanel({
  followUp = false,
  transcript,
  startedAt,
  limit,
  announce,
  onStop,
  onLimit,
}: {
  followUp?: boolean;
  transcript: TranscriptState;
  startedAt: number;
  limit: number;
  announce: (text: string) => void;
  onStop: () => void;
  onLimit: () => void;
}) {
  const t = useT();

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
            threshold === 60 ? '1 minute left.' : t('ui.template.28', { v0: threshold }),
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
  }, [startedAt, limit, t]);
  const final = [transcript.committed, transcript.runFinal].filter(Boolean).join(' ');
  return (
    <section className="room-recorder">
      <div className="recording-heading">
        <p className="recording-label">
          <span aria-hidden="true">● </span>
          <T id="components.room.recorder.panel.1" />
        </p>
        <p className="recording-clock">
          <span aria-hidden="true">
            <TimerDisplay ms={elapsed} /> /{' '}
          </span>
          <span>
            {followUp ? (
              <>
                <T id="components.room.recorder.panel.2" />
                {formatMmSs(limit * 1000)}.
              </>
            ) : (
              <>
                <T id="components.room.recorder.panel.3" />
                {formatMmSs(RECORDING_GUIDE.MIN_SECONDS * 1000)}–
                {formatMmSs(RECORDING_GUIDE.MAX_SECONDS * 1000)}
              </>
            )}
          </span>
        </p>
      </div>
      <div className="recording-progress" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (elapsed / (limit * 1000)) * 100)}%` }} />
      </div>
      <section className="transcript-card" aria-labelledby="live-transcript" aria-live="off">
        <h2 id="live-transcript" className="sr-only">
          <T id="components.room.recorder.panel.4" />
        </h2>
        {!final && !transcript.runInterim ? (
          <p>
            <T id="components.room.recorder.panel.5" />
          </p>
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
      <p className="recording-help">
        <T id="components.room.recorder.panel.6" /> {durationWords(limit, t)}.
      </p>
      <Button className="recording-stop" variant="on-dark" data-phase-focus onClick={onStop}>
        <T id="components.room.recorder.panel.7" />
      </Button>
    </section>
  );
}
