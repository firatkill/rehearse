'use client';
import { useCallback, useEffect, useReducer, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestFeedback } from '@/lib/api/client';
import { ANSWER, SESSION } from '@/lib/config';
import { initialRoomState, roomReducer, type RoomEvent } from '@/lib/room/machine';
import { computeDelivery } from '@/lib/metrics/delivery';
import { useRepository, switchToMemoryRepository } from './use-repository';
import type { SessionRepository } from '@/lib/storage/repository';
import { useOnline } from './use-online';
import { useVisibility } from './use-visibility';
import { useCapabilities } from './use-capabilities';
import { useRecorder } from './use-recorder';
import { useTTS } from './use-tts';
import { useVoices } from './use-voices';
import { getRecognitionCtor } from '@/lib/speech/detect';
import { checkMicrophone } from '@/lib/speech/microphone';
import { primeSynthesis } from '@/lib/speech/tts';
import { chunkForSpeech } from '@/lib/speech/chunk';
import { pickVoice } from '@/lib/speech/voices';

export function useInterviewRoom(id: string) {
  const repository = useRepository();
  const router = useRouter();
  const online = useOnline();
  const capabilities = useCapabilities();
  const ctor = useMemo(
    () => (capabilities?.recognition ? getRecognitionCtor(window) : null),
    [capabilities],
  );
  const recorder = useRecorder(ctor);
  const {
    start: startRecorder,
    stop: stopRecorder,
    abort: abortRecorder,
    reset: resetRecorder,
    getTranscript,
    getTiming,
  } = recorder;
  const { play, cancel, activeChunk } = useTTS();
  const { voices } = useVoices();
  const [readAloudError, setReadAloudError] = useState(false);
  const [feedbackTransport, setFeedbackTransport] = useState<{
    network: boolean;
    resetAt: string | null;
  }>({ network: false, resetAt: null });
  const micPending = useRef(false);
  const [replay, setReplay] = useState(0);
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
  const rawSend = useCallback((event: RoomEvent) => {
    if (event.type === 'CONFIRM_END') ended.current = true;
    dispatch({ event, now: Date.now() });
  }, []);
  const send = useCallback(
    (event: RoomEvent) => {
      const current = latest.current;
      if (event.type === 'SUBMIT') setFeedbackTransport({ network: false, resetAt: null });
      if (event.type === 'START_INTERVIEW') {
        if (micPending.current) return;
        if (capabilities?.synthesis) primeSynthesis(window.speechSynthesis);
        if (current.mode === 'voice' && current.online) {
          micPending.current = true;
          void checkMicrophone().then((result) => {
            micPending.current = false;
            if (latest.current.phase.kind === 'intro') rawSend({ type: 'MIC_CHECKED', result });
          });
        } else rawSend(event);
        return;
      }
      if (event.type === 'TYPE_INSTEAD') {
        const rawTranscript =
          current.phase.kind === 'answering' && current.phase.answerMode === 'voice'
            ? getTranscript()
            : undefined;
        abortRecorder();
        rawSend({ ...event, ...(rawTranscript === undefined ? {} : { rawTranscript }) });
        return;
      }
      if (event.type === 'STOP_READING' || event.type === 'START_ANSWERING') {
        void cancel().then(() => {
          rawSend(event);
        });
        return;
      }
      if (event.type === 'REPLAY') setReplay((value) => value + 1);
      if (event.type === 'RETRY_RECORDING' || event.type === 'CONFIRM_RECORD_AGAIN') {
        if (event.type === 'CONFIRM_RECORD_AGAIN') resetRecorder();
        // A failed Safari automatic start must be retried synchronously in this click.
        if (current.online) startRecorder();
      }
      if (event.type === 'NEXT' || event.type === 'CONFIRM_SKIP' || event.type === 'CONFIRM_END') {
        abortRecorder();
        void cancel();
        resetRecorder();
        setReadAloudError(false);
      }
      rawSend(event);
    },
    [capabilities, getTranscript, abortRecorder, cancel, rawSend, resetRecorder, startRecorder],
  );
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    if (
      !online &&
      latest.current.phase.kind === 'answering' &&
      latest.current.phase.answerMode === 'voice'
    )
      stopRecorder('network');
    rawSend({ type: 'ONLINE', online });
  }, [online, rawSend, stopRecorder]);
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
  useEffect(() => {
    if (kind !== 'submitting') return;
    const current = latest.current;
    const session = current.session;
    const answer = current.answers.find((item) => item.index === current.index);
    if (!session || !answer) return;
    const controller = new AbortController();
    const isAborted = () => controller.signal.aborted;
    void (async () => {
      await persist((repo) => repo.putAnswer(answer));
      if (isAborted()) return;
      if (!session.token) {
        rawSend({
          type: 'FEEDBACK_FAILED',
          code: 'TOKEN_MISSING',
          requestId: null,
          sessionCallsRemaining: null,
        });
        return;
      }
      const result = await requestFeedback(
        session.token,
        {
          sessionId: session.id,
          answerIndex: answer.index,
          questionId: answer.questionId,
          mode: answer.mode,
          transcript: answer.transcript,
        },
        controller.signal,
      );
      if (isAborted()) return;
      if (result.ok) {
        const { model, promptVersion, latencyMs, costUsd } = result.data.meta;
        const meta = { model, promptVersion, latencyMs, costUsd };
        await persist((repo) =>
          repo.putAnswer({
            ...answer,
            status: 'scored',
            feedback: result.data.feedback,
            feedbackMeta: meta,
            updatedAt: new Date().toISOString(),
          }),
        );
        if (!isAborted()) rawSend({ type: 'FEEDBACK_OK', feedback: result.data.feedback, meta });
      } else {
        setFeedbackTransport({
          network: result.kind === 'network',
          resetAt: result.kind === 'http' ? (result.error.resetAt ?? null) : null,
        });
        rawSend({
          type: 'FEEDBACK_FAILED',
          code: result.kind === 'http' ? result.error.code : 'INTERNAL_ERROR',
          requestId: result.kind === 'http' ? result.error.requestId : null,
          sessionCallsRemaining:
            result.kind === 'http' ? (result.error.sessionCallsRemaining ?? null) : null,
        });
      }
    })();
    return () => {
      controller.abort();
    };
  }, [kind, state.index, persist, rawSend]);
  const paused = state.phase.kind === 'thinking' && state.phase.paused;
  const interrupted = state.phase.kind === 'asking' && state.phase.interrupted;
  const prompt = state.session?.questions[state.index]?.prompt ?? '';
  const voiceURI = state.session?.setup.voiceURI ?? null;
  const rate = state.session?.setup.rate ?? 1;
  useEffect(() => {
    if (kind !== 'asking' || interrupted) return;
    if (!capabilities?.synthesis) {
      rawSend({ type: 'TTS_DONE', result: 'skipped' });
      return;
    }
    let alive = true;
    void play(
      window.speechSynthesis,
      chunkForSpeech(prompt),
      pickVoice(voices, voiceURI).voice,
      rate,
    ).then((result) => {
      if (!alive) return;
      if (result === 'error') setReadAloudError(true);
      rawSend({ type: 'TTS_DONE', result });
    });
    return () => {
      alive = false;
      void cancel();
    };
  }, [
    kind,
    interrupted,
    replay,
    prompt,
    capabilities,
    voiceURI,
    rate,
    voices,
    play,
    cancel,
    rawSend,
  ]);
  const answerMode = state.phase.kind === 'answering' ? state.phase.answerMode : null;
  const startedAt = state.phase.kind === 'answering' ? state.phase.startedAt : null;
  useEffect(() => {
    if (answerMode !== 'voice') return;
    let alive = true;
    void cancel().then(() => {
      if (alive) startRecorder();
    });
    return () => {
      alive = false;
      abortRecorder();
    };
  }, [answerMode, startedAt, state.index, cancel, startRecorder, abortRecorder]);
  useEffect(() => {
    if (answerMode !== 'voice') return;
    if (recorder.state.kind === 'stopped')
      rawSend({
        type: 'RECORDER_STOPPED',
        reason: recorder.state.reason,
        rawTranscript: getTranscript(),
        timing: getTiming(),
      });
    if (recorder.state.kind === 'failed')
      rawSend({
        type: 'RECORDER_FAILED',
        fail: recorder.state.fail,
        rawTranscript: getTranscript(),
      });
  }, [answerMode, recorder.state, getTranscript, getTiming, rawSend]);
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
        if (hidden) {
          if (latest.current.phase.kind === 'asking') void cancel();
          if (
            latest.current.phase.kind === 'answering' &&
            latest.current.phase.answerMode === 'voice'
          )
            stopRecorder('tab_hidden');
        }
        rawSend({ type: 'VISIBILITY', hidden });
      },
      [send, rawSend, cancel, stopRecorder],
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
      if (!answer) return;
      const text = answer.mode === 'voice' ? getTranscript() : draft.current;
      const updated = {
        ...answer,
        transcript: text,
        rawTranscript: text,
        ...(answer.mode === 'voice' ? { timing: getTiming() } : {}),
        updatedAt: new Date().toISOString(),
      };
      void persist((repo) =>
        repo.putAnswer({
          ...updated,
          metrics: computeDelivery(updated),
        }),
      );
    }, ANSWER.DRAFT_SAVE_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [kind, state.index, persist, getTranscript, getTiming]);
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
  return {
    state,
    send,
    onDraft,
    online,
    recorder,
    activeChunk,
    readAloudError,
    capabilities,
    feedbackTransport,
  };
}
