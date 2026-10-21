import { ANSWER, SPEECH } from '@/lib/config';
import { countWords } from '@/lib/metrics/words';
import { applyResults, commitRun, fullText, type TranscriptState } from './transcript';
import { recognitionFailure } from './errors';
export type StopReason =
  'user' | 'time_limit' | 'char_cap' | 'tab_hidden' | 'network' | 'unexpected_stop';
export type FailKind = 'permission' | 'no-device' | 'no-speech' | 'unavailable';

export type RecorderState =
  | { kind: 'idle' }
  | { kind: 'starting'; run: number }
  | { kind: 'listening'; run: number }
  | { kind: 'restarting'; run: number }
  | { kind: 'stopping'; run: number; reason: StopReason }
  | { kind: 'stopped'; reason: StopReason }
  | { kind: 'failed'; fail: FailKind };

export type RecorderCtx = {
  transcript: TranscriptState; // section 9.5
  restarts: number; // consecutive restarts of runs that produced no RESULT; reset to 0 when a run delivers a RESULT
  noSpeechRestarts: number; // restarts after no-speech with zero words; reset to 0 on START from idle/failed
  sawNoSpeech: boolean; // set by a no-speech error in the current run
  runHadResult: boolean; // set by any RESULT in the current run
  startedAtMs: number | null; // performance.now() at first START
  resultOffsetsMs: number[];
};

export type RecorderEvent =
  | { type: 'START'; now: number }
  | { type: 'RUN_STARTED' }
  | {
      type: 'RESULT';
      now: number;
      results: ReadonlyArray<{ transcript: string; isFinal: boolean }>;
    }
  | { type: 'ERROR'; code: string }
  | { type: 'END' }
  | { type: 'STOP'; reason: StopReason }
  | { type: 'GRACE_TIMEOUT' }
  | { type: 'RESTART_DUE' };

export type RecorderSnapshot = { state: RecorderState; ctx: RecorderCtx };
export function initialRecorder(committed = ''): RecorderSnapshot {
  return {
    state: { kind: 'idle' },
    ctx: {
      transcript: { committed, runFinal: '', runInterim: '' },
      restarts: 0,
      noSpeechRestarts: 0,
      sawNoSpeech: false,
      runHadResult: false,
      startedAtMs: null,
      resultOffsetsMs: [],
    },
  };
}
export function recorderReducer(
  current: RecorderSnapshot,
  event: RecorderEvent,
  lastRun = 0,
): RecorderSnapshot {
  const { state, ctx } = current;
  const active = state.kind === 'starting' || state.kind === 'listening';
  const canStop = active || state.kind === 'restarting';
  const words = countWords(fullText(ctx.transcript));
  const committed = () => ({ ...ctx, transcript: commitRun(ctx.transcript) });
  switch (event.type) {
    case 'START':
      return state.kind === 'idle' || state.kind === 'failed'
        ? {
            state: { kind: 'starting', run: lastRun + 1 },
            ctx: {
              ...committed(),
              startedAtMs: ctx.startedAtMs ?? event.now,
              restarts: 0,
              noSpeechRestarts: 0,
              sawNoSpeech: false,
              runHadResult: false,
            },
          }
        : current;
    case 'RUN_STARTED':
      return state.kind === 'starting'
        ? { ctx, state: { kind: 'listening', run: state.run } }
        : current;
    case 'RESULT': {
      if (!active && state.kind !== 'stopping') return current;
      const transcript = applyResults(ctx.transcript, event.results);
      if (state.kind === 'stopping') return { state, ctx: { ...ctx, transcript } };
      const nextCtx = {
        ...ctx,
        transcript,
        runHadResult: true,
        restarts: 0,
        resultOffsetsMs: [...ctx.resultOffsetsMs, event.now - (ctx.startedAtMs ?? event.now)].slice(
          0,
          SPEECH.RESULT_OFFSETS_MAX,
        ),
      };
      return {
        ctx: nextCtx,
        state:
          fullText(transcript).length >= ANSWER.MAX_CHARS
            ? { kind: 'stopping', run: state.run, reason: 'char_cap' }
            : { kind: 'listening', run: state.run },
      };
    }
    case 'ERROR':
      if (event.code === 'aborted' || !canStop) return current;
      if (event.code === 'no-speech')
        return active ? { state, ctx: { ...ctx, sawNoSpeech: true } } : current;
      if (event.code === 'network' && words > 0)
        return { ctx: committed(), state: { kind: 'stopped', reason: 'network' } };
      return { ctx: committed(), state: { kind: 'failed', fail: recognitionFailure(event.code) } };
    case 'END': {
      if (state.kind === 'stopping')
        return { ctx: committed(), state: { kind: 'stopped', reason: state.reason } };
      if (!active) return current;
      if (ctx.sawNoSpeech && words === 0) {
        if (ctx.noSpeechRestarts >= SPEECH.NO_SPEECH_AUTO_RESTARTS)
          return { ctx, state: { kind: 'failed', fail: 'no-speech' } };
        return {
          ctx: { ...ctx, noSpeechRestarts: ctx.noSpeechRestarts + 1 },
          state: { kind: 'restarting', run: state.run },
        };
      }
      if (!ctx.runHadResult && ctx.restarts >= SPEECH.MAX_RESTARTS)
        return { ctx: committed(), state: { kind: 'stopped', reason: 'unexpected_stop' } };
      return {
        ctx: { ...committed(), restarts: ctx.runHadResult ? 0 : ctx.restarts + 1 },
        state: { kind: 'restarting', run: state.run },
      };
    }
    case 'RESTART_DUE':
      return state.kind === 'restarting'
        ? {
            ctx: { ...ctx, sawNoSpeech: false, runHadResult: false },
            state: { kind: 'starting', run: state.run + 1 },
          }
        : current;
    case 'STOP':
      if (state.kind === 'restarting')
        return { ctx: committed(), state: { kind: 'stopped', reason: event.reason } };
      return state.kind === 'starting' || state.kind === 'listening'
        ? { ctx, state: { kind: 'stopping', run: state.run, reason: event.reason } }
        : current;
    case 'GRACE_TIMEOUT':
      return state.kind === 'stopping'
        ? { ctx: committed(), state: { kind: 'stopped', reason: state.reason } }
        : current;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
