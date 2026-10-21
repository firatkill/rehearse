'use client';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ANSWER, SESSION } from '@/lib/config';
import { initialRoomState, roomReducer, type RoomEvent } from '@/lib/room/machine';
import { computeDelivery } from '@/lib/metrics/delivery';
import { useRepository, switchToMemoryRepository } from './use-repository';
import type { SessionRepository } from '@/lib/storage/repository';
import { useOnline } from './use-online';
import { useVisibility } from './use-visibility';

export function useInterviewRoom(id: string) {
  const repository = useRepository();
  const router = useRouter();
  const online = useOnline();
  const [state, dispatch] = useReducer(
    (s: typeof initialRoomState, action: { event: RoomEvent; now: number }) =>
      roomReducer(s, action.event, action.now),
    initialRoomState,
  );
  const latest = useRef(state);
  const activeRepository = useRef(repository);
  const writes = useRef(Promise.resolve());
  const persist = useCallback((operation: (repo: SessionRepository) => Promise<unknown>) => {
    const snapshot = latest.current;
    writes.current = writes.current.then(async () => {
      try {
        await operation(activeRepository.current);
      } catch {
        if (!snapshot.session) return;
        activeRepository.current = await switchToMemoryRepository(
          snapshot.session,
          snapshot.answers,
        );
        await operation(activeRepository.current);
      }
    });
    return writes.current;
  }, []);
  const draft = useRef('');
  const ended = useRef(false);
  const send = useCallback((event: RoomEvent) => {
    if (event.type === 'CONFIRM_END') ended.current = true;
    dispatch({ event, now: Date.now() });
  }, []);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    send({ type: 'ONLINE', online });
  }, [online, send]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([repository.getSession(id), repository.getAnswers(id)]).then(
      ([session, answers]) => {
        if (!cancelled)
          send(session ? { type: 'LOADED', session, answers } : { type: 'NOT_FOUND' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, repository, send]);
  const kind = state.phase.kind;
  const paused = state.phase.kind === 'thinking' && state.phase.paused;
  useEffect(() => {
    if (kind === 'asking') send({ type: 'TTS_DONE', result: 'skipped' });
  }, [kind, send]);
  const lastTick = useRef(0);
  useEffect(() => {
    if (kind !== 'thinking' || paused) return;
    lastTick.current = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      send({ type: 'THINK_TICK', elapsedMs: now - lastTick.current });
      lastTick.current = now;
    }, SESSION.TIMER_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [kind, paused, state.index, send]);
  useVisibility(
    useCallback(
      (hidden: boolean) => {
        if (hidden && latest.current.phase.kind === 'thinking' && !latest.current.phase.paused) {
          send({ type: 'THINK_TICK', elapsedMs: performance.now() - lastTick.current });
        }
        send({ type: 'VISIBILITY', hidden });
      },
      [send],
    ),
  );
  useEffect(() => {
    const session = state.session;
    if (!session || kind === 'loading' || kind === 'not-found') return;
    const phase =
      kind === 'speech-error'
        ? 'answering'
        : kind === 'feedback-error'
          ? 'review'
          : kind === 'saved'
            ? 'feedback'
            : kind;
    void persist((repo) =>
      repo.updateSession(id, {
        ...session,
        currentMode: state.mode,
        checkpoint: { index: state.index, phase, at: new Date().toISOString() },
      }),
    );
  }, [id, kind, state.index, state.mode, state.session, persist]);
  const priorAnswerPhase = useRef(kind);
  useEffect(() => {
    if (kind === 'done') return;
    const editing = kind === 'review' && priorAnswerPhase.current === 'review';
    priorAnswerPhase.current = kind;
    const timer = setTimeout(
      () => {
        void persist((repo) => Promise.all(state.answers.map((answer) => repo.putAnswer(answer))));
      },
      editing ? ANSWER.EDIT_SAVE_DEBOUNCE_MS : 0,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [kind, state.answers, persist]);
  useEffect(() => {
    if (kind !== 'answering') return;
    draft.current =
      latest.current.answers.find((a) => a.index === latest.current.index)?.transcript ?? '';
    const timer = setInterval(() => {
      const answer = latest.current.answers.find((a) => a.index === latest.current.index);
      if (!answer || answer.mode !== 'text') return;
      const updated = {
        ...answer,
        transcript: draft.current,
        rawTranscript: draft.current,
        updatedAt: new Date().toISOString(),
      };
      void persist((repo) =>
        repo.putAnswer({
          ...updated,
          metrics: computeDelivery({ ...updated, mode: 'text' }),
        }),
      );
    }, ANSWER.DRAFT_SAVE_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [kind, state.index, persist]);
  useEffect(() => {
    if (kind !== 'done' || !state.session) return;
    const session = state.session;
    void (async () => {
      if (
        ended.current &&
        !state.answers.some((a) => a.status === 'saved' || a.status === 'scored')
      ) {
        await persist((repo) => repo.deleteSession(id));
        router.replace('/setup');
      } else {
        await persist((repo) => repo.updateSession(id, session));
        await persist((repo) => Promise.all(state.answers.map((answer) => repo.putAnswer(answer))));
        router.replace(`/session/${id}/report`);
      }
    })();
  }, [id, kind, state.session, state.answers, persist, router]);
  const onDraft = useCallback((text: string) => {
    draft.current = text;
  }, []);
  return { state, send, onDraft, online };
}
