'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ANSWER, SPEECH } from '@/lib/config';
import { createRecognizer } from '@/lib/speech/recognizer';
import {
  initialRecorder,
  recorderReducer,
  type RecorderEvent,
} from '@/lib/speech/recorder-machine';
import { capText, fullText } from '@/lib/speech/transcript';
import type { SpeechRecognitionCtor, StopReason } from '@/lib/speech/types';
import type { Timing } from '@/lib/storage/schema';
export function useRecorder(Ctor: SpeechRecognitionCtor | null, clock?: () => number) {
  // Keep the production clock callback stable even when the bundler inlines defaults.
  const now = useCallback(() => clock?.() ?? performance.now(), [clock]);
  const [snapshot, setSnapshot] = useState(initialRecorder);
  const current = useRef(snapshot);
  const instance = useRef<ReturnType<typeof createRecognizer> | null>(null);
  const generation = useRef(0);
  const lastRun = useRef(0);
  const restart = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grace = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedAt = useRef<number | null>(null);
  const clearTimers = useCallback(() => {
    if (restart.current !== null) clearTimeout(restart.current);
    if (grace.current !== null) clearTimeout(grace.current);
    restart.current = null;
    grace.current = null;
  }, []);
  const abort = useCallback(() => {
    generation.current += 1;
    clearTimers();
    instance.current?.abort();
    instance.current = null;
  }, [clearTimers]);
  const dispatch = useCallback(
    function dispatchEvent(event: RecorderEvent): void {
      const previous = current.current;
      const next = recorderReducer(previous, event, lastRun.current);
      if (next === previous) return;
      current.current = next;
      const state = next.state;
      if (state.kind === 'stopped' || state.kind === 'failed') finishedAt.current = now();
      setSnapshot(next);
      if (
        state.kind === 'starting' &&
        (previous.state.kind !== 'starting' || state.run !== previous.state.run)
      ) {
        clearTimers();
        generation.current += 1;
        const ownGeneration = generation.current;
        lastRun.current = state.run;
        instance.current?.abort();
        if (!Ctor) {
          dispatchEvent({ type: 'ERROR', code: 'start-failed' });
          return;
        }
        const deliver = (e: RecorderEvent) => {
          if (ownGeneration === generation.current) dispatchEvent(e);
        };
        const recognizer = createRecognizer(Ctor, {
          onStart: () => {
            deliver({ type: 'RUN_STARTED' });
          },
          onResult: (event) => {
            const results: Array<{ transcript: string; isFinal: boolean }> = [];
            for (let i = 0; i < event.results.length; i++) {
              const result = event.results[i];
              const alternative = result?.[0];
              if (result && alternative)
                results.push({ transcript: alternative.transcript, isFinal: result.isFinal });
            }
            deliver({ type: 'RESULT', now: now(), results });
          },
          onError: (code) => {
            deliver({ type: 'ERROR', code });
          },
          onEnd: () => {
            deliver({ type: 'END' });
          },
        });
        instance.current = recognizer;
        try {
          recognizer.start();
        } catch {
          deliver({ type: 'ERROR', code: 'start-failed' });
        }
      } else if (state.kind === 'restarting' && previous.state.kind !== 'restarting') {
        clearTimers();
        generation.current += 1;
        restart.current = setTimeout(() => {
          dispatchEvent({ type: 'RESTART_DUE' });
        }, SPEECH.RESTART_DELAY_MS);
      } else if (state.kind === 'stopping' && previous.state.kind !== 'stopping') {
        clearTimers();
        grace.current = setTimeout(() => {
          dispatchEvent({ type: 'GRACE_TIMEOUT' });
        }, SPEECH.STOP_GRACE_MS);
        instance.current?.stop();
      } else if (state.kind === 'stopped' || state.kind === 'failed') abort();
    },
    [Ctor, now, clearTimers, abort],
  );
  useEffect(
    () => () => {
      abort();
    },
    [abort],
  );
  const start = useCallback(() => {
    finishedAt.current = null;
    dispatch({ type: 'START', now: now() });
  }, [dispatch, now]);
  const stop = useCallback(
    (reason: StopReason) => {
      dispatch({ type: 'STOP', reason });
    },
    [dispatch],
  );
  const reset = useCallback(
    (committed = '') => {
      abort();
      lastRun.current = 0;
      finishedAt.current = null;
      const fresh = initialRecorder(committed);
      current.current = fresh;
      setSnapshot(fresh);
    },
    [abort],
  );
  const getTiming = useCallback(
    (): Timing => ({
      recordingMs:
        current.current.ctx.startedAtMs === null
          ? null
          : (finishedAt.current ?? now()) - current.current.ctx.startedAtMs,
      firstResultOffsetMs: current.current.ctx.resultOffsetsMs[0] ?? null,
      resultOffsetsMs: [...current.current.ctx.resultOffsetsMs],
    }),
    [now],
  );
  const getTranscript = useCallback(
    () => capText(fullText(current.current.ctx.transcript), ANSWER.MAX_CHARS),
    [],
  );
  return {
    state: snapshot.state,
    ctx: snapshot.ctx,
    rawTranscript: capText(fullText(snapshot.ctx.transcript), ANSWER.MAX_CHARS),
    start,
    stop,
    abort,
    reset,
    getTiming,
    getTranscript,
  };
}
