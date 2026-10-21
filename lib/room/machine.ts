import { SESSION, STORAGE } from '@/lib/config';
import { countWords } from '@/lib/metrics/words';
import { computeDelivery } from '@/lib/metrics/delivery';
import type { ErrorCode } from '@/lib/errors';
import type { SessionRecord, AnswerRecord, Timing } from '@/lib/storage/schema';
import type { Feedback } from '@/lib/feedback/schema';
import type { MicCheck, SpeakResult, StopReason, FailKind } from '@/lib/speech/types';
type FeedbackMeta = NonNullable<AnswerRecord['feedbackMeta']>;
export type SpeechErrorKind = FailKind; // 'permission' | 'no-device' | 'no-speech' | 'unavailable'
export type ReviewNotice =
  'time_limit' | 'char_cap' | 'tab_hidden' | 'network' | 'unexpected_stop' | 'restored';

export type Phase =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'intro' }
  | { kind: 'asking'; interrupted: boolean }
  | { kind: 'thinking'; remainingMs: number; paused: boolean; wasPaused: boolean }
  | { kind: 'answering'; startedAt: number; answerMode: 'voice' | 'text' }
  | { kind: 'speech-error'; error: SpeechErrorKind }
  | { kind: 'review'; notice: ReviewNotice | null }
  | { kind: 'submitting'; startedAt: number }
  | { kind: 'feedback' }
  | { kind: 'saved' }
  | {
      kind: 'feedback-error';
      code: ErrorCode;
      requestId: string | null;
      sessionCallsRemaining: number | null;
    }
  | { kind: 'done' };

export type RoomState = {
  session: SessionRecord | null;
  answers: AnswerRecord[];
  index: number;
  mode: 'voice' | 'text'; // session.currentMode
  phase: Phase;
  dialog: null | 'record-again' | 'skip' | 'end';
  online: boolean;
  restoredNotice: boolean;
};
export type RoomEvent =
  | { type: 'LOADED'; session: SessionRecord; answers: AnswerRecord[] }
  | { type: 'NOT_FOUND' }
  | { type: 'START_INTERVIEW' }
  | { type: 'MIC_CHECKED'; result: MicCheck }
  | { type: 'TTS_DONE'; result: SpeakResult | 'skipped' }
  | { type: 'STOP_READING' }
  | { type: 'REPLAY' }
  | { type: 'START_ANSWERING'; now: number }
  | { type: 'THINK_TICK'; elapsedMs: number }
  | { type: 'VISIBILITY'; hidden: boolean }
  | { type: 'RECORDER_STOPPED'; reason: StopReason; rawTranscript: string; timing: Timing }
  | { type: 'RECORDER_FAILED'; fail: FailKind; rawTranscript: string }
  | { type: 'TEXT_REVIEW'; transcript: string }
  | { type: 'TYPE_INSTEAD'; rawTranscript?: string }
  | { type: 'RETRY_RECORDING'; now: number }
  | { type: 'EDIT'; transcript: string }
  | { type: 'OPEN_DIALOG'; dialog: 'record-again' | 'skip' | 'end' }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'CONFIRM_RECORD_AGAIN'; now: number }
  | { type: 'SUBMIT'; now: number }
  | { type: 'FEEDBACK_OK'; feedback: Feedback; meta: FeedbackMeta }
  | {
      type: 'FEEDBACK_FAILED';
      code: ErrorCode;
      requestId: string | null;
      sessionCallsRemaining: number | null;
    }
  | { type: 'SAVE_WITHOUT_FEEDBACK' }
  | { type: 'CONFIRM_SKIP' }
  | { type: 'NEXT' }
  | { type: 'CONFIRM_END' }
  | { type: 'ONLINE'; online: boolean };

export const initialRoomState: RoomState = {
  session: null,
  answers: [],
  index: 0,
  mode: 'text',
  phase: { kind: 'loading' },
  dialog: null,
  online: true,
  restoredNotice: false,
};
const hasWords = (text: string) => countWords(text) > 0;
const terminal = (answer: AnswerRecord) => ['scored', 'saved', 'skipped'].includes(answer.status);
const thinking = (): Phase => ({
  kind: 'thinking',
  remainingMs: SESSION.THINK_SECONDS * 1000,
  paused: false,
  wasPaused: false,
});
function questionPhase(session: SessionRecord): Phase {
  return session.setup.readAloud ? { kind: 'asking', interrupted: false } : thinking();
}
export function resumePhase(session: SessionRecord, answers: AnswerRecord[]): Phase {
  if (session.status !== 'in_progress') return { kind: 'done' };
  const answer = answers.find((a) => a.index === session.checkpoint.index);
  switch (session.checkpoint.phase) {
    case 'intro':
      return { kind: 'intro' };
    case 'asking':
    case 'thinking':
      return { kind: 'intro' };
    case 'answering':
      return answer && hasWords(answer.transcript)
        ? { kind: 'review', notice: 'restored' }
        : { kind: 'intro' };
    case 'review':
    case 'submitting':
      return { kind: 'review', notice: 'restored' };
    case 'feedback':
      return answer?.status === 'scored'
        ? { kind: 'feedback' }
        : answer?.status === 'saved'
          ? { kind: 'saved' }
          : { kind: 'review', notice: 'restored' };
    case 'done':
      return { kind: 'done' };
    default: {
      const impossible: never = session.checkpoint.phase;
      return impossible;
    }
  }
}
function updateAnswer(state: RoomState, patch: Partial<AnswerRecord>, now: number): RoomState {
  const session = state.session;
  const question = session?.questions[state.index];
  if (!session || !question) return state;
  const at = new Date(now).toISOString();
  const existing = state.answers.find((a) => a.index === state.index);
  const base: AnswerRecord = existing ?? {
    schemaVersion: STORAGE.RECORD_SCHEMA_VERSION,
    sessionId: session.id,
    index: state.index,
    questionId: question.id,
    mode: state.mode,
    status: 'draft',
    rawTranscript: '',
    transcript: '',
    timing: { recordingMs: null, firstResultOffsetMs: null, resultOffsetsMs: [] },
    metrics: {
      words: 0,
      speakingMs: null,
      wpm: null,
      fillers: { total: 0, byPhrase: {} },
      longestPauseMs: null,
      longPauses: null,
    },
    feedback: null,
    feedbackMeta: null,
    attempts: 0,
    notice: null,
    createdAt: at,
    updatedAt: at,
  };
  const answer = { ...base, ...patch, updatedAt: at };
  answer.metrics = computeDelivery(answer);
  return {
    ...state,
    answers: [...state.answers.filter((a) => a.index !== state.index), answer].sort(
      (a, b) => a.index - b.index,
    ),
  };
}
function answering(state: RoomState, now: number, mode = state.mode): RoomState {
  if (!state.online) mode = 'text';
  return {
    ...updateAnswer(state, { mode, status: 'draft' }, now),
    phase: { kind: 'answering', startedAt: now, answerMode: mode },
    dialog: null,
  };
}
function finish(state: RoomState, now: number): RoomState {
  if (!state.session) return state;
  const at = new Date(now).toISOString();
  const completed = state.session.questions.every((_, index) =>
    state.answers.some((a) => a.index === index && terminal(a)),
  );
  return {
    ...state,
    phase: { kind: 'done' },
    dialog: null,
    session: {
      ...state.session,
      status: completed ? 'completed' : 'ended_early',
      completedAt: at,
      updatedAt: at,
      checkpoint: { index: state.index, phase: 'done', at },
    },
  };
}
function next(state: RoomState, now: number): RoomState {
  if (!state.session) return state;
  if (state.index + 1 >= state.session.questions.length) return finish(state, now);
  return {
    ...state,
    index: state.index + 1,
    phase: questionPhase(state.session),
    dialog: null,
    restoredNotice: false,
  };
}
export function roomReducer(state: RoomState, event: RoomEvent, now: number): RoomState {
  const kind = state.phase.kind;
  const current = state.answers.find((a) => a.index === state.index);
  switch (event.type) {
    case 'LOADED': {
      if (kind !== 'loading') return state;
      const phase = resumePhase(event.session, event.answers);
      return {
        ...state,
        session: event.session,
        answers: event.answers,
        index: event.session.checkpoint.index,
        mode: event.session.currentMode,
        phase,
        restoredNotice: phase.kind === 'intro' && event.session.checkpoint.phase !== 'intro',
      };
    }
    case 'NOT_FOUND':
      return kind === 'loading' ? { ...state, phase: { kind: 'not-found' } } : state;
    case 'START_INTERVIEW':
      return kind === 'intro' && state.session
        ? { ...state, phase: questionPhase(state.session), restoredNotice: false }
        : state;
    case 'MIC_CHECKED': {
      if (kind !== 'intro') return state;
      if (event.result === 'granted')
        return state.session ? { ...state, phase: questionPhase(state.session) } : state;
      return {
        ...state,
        phase: {
          kind: 'speech-error',
          error:
            event.result === 'denied'
              ? 'permission'
              : event.result === 'no-device'
                ? 'no-device'
                : 'unavailable',
        },
      };
    }
    case 'TTS_DONE':
      return kind === 'asking' && event.result !== 'cancelled'
        ? { ...state, phase: thinking() }
        : state;
    case 'STOP_READING':
      return kind === 'asking' ? { ...state, phase: thinking() } : state;
    case 'REPLAY':
      return kind === 'asking' || kind === 'thinking'
        ? { ...state, phase: { kind: 'asking', interrupted: false } }
        : state;
    case 'START_ANSWERING':
      return kind === 'asking' || kind === 'thinking' ? answering(state, event.now) : state;
    case 'THINK_TICK': {
      if (state.phase.kind !== 'thinking' || state.phase.paused) return state;
      const remainingMs = Math.max(0, state.phase.remainingMs - event.elapsedMs);
      return remainingMs === 0
        ? answering(state, now)
        : { ...state, phase: { ...state.phase, remainingMs } };
    }
    case 'VISIBILITY': {
      if (state.phase.kind === 'asking' && event.hidden)
        return { ...state, phase: { kind: 'asking', interrupted: true } };
      if (state.phase.kind === 'thinking')
        return {
          ...state,
          phase: {
            ...state.phase,
            paused: event.hidden,
            wasPaused: state.phase.wasPaused || state.phase.paused,
          },
        };
      return state;
    }
    case 'RECORDER_STOPPED': {
      if (state.phase.kind !== 'answering' || state.phase.answerMode !== 'voice') return state;
      const notice = event.reason === 'user' ? null : event.reason;
      return {
        ...updateAnswer(
          state,
          {
            status: 'review',
            rawTranscript: event.rawTranscript,
            transcript: event.rawTranscript,
            timing: event.timing,
            notice,
          },
          now,
        ),
        phase: { kind: 'review', notice },
      };
    }
    case 'RECORDER_FAILED':
      return state.phase.kind === 'answering' && state.phase.answerMode === 'voice'
        ? {
            ...updateAnswer(
              state,
              { rawTranscript: event.rawTranscript, transcript: event.rawTranscript },
              now,
            ),
            phase: { kind: 'speech-error', error: event.fail },
          }
        : state;
    case 'TEXT_REVIEW':
      return state.phase.kind === 'answering' && state.phase.answerMode === 'text'
        ? {
            ...updateAnswer(
              state,
              {
                status: 'review',
                transcript: event.transcript,
                rawTranscript: event.transcript,
                notice: null,
              },
              now,
            ),
            phase: { kind: 'review', notice: null },
          }
        : state;
    case 'TYPE_INSTEAD': {
      if (
        state.mode !== 'voice' ||
        !['asking', 'thinking', 'answering', 'speech-error'].includes(kind)
      )
        return state;
      const updated = {
        ...(event.rawTranscript === undefined
          ? state
          : updateAnswer(
              state,
              { rawTranscript: event.rawTranscript, transcript: event.rawTranscript },
              now,
            )),
        mode: 'text' as const,
        session: state.session ? { ...state.session, currentMode: 'text' as const } : null,
      };
      return kind === 'answering' || kind === 'speech-error'
        ? answering(updated, now, 'text')
        : updated;
    }
    case 'RETRY_RECORDING':
      return kind === 'speech-error' ? answering(state, event.now, 'voice') : state;
    case 'EDIT':
      return kind === 'review'
        ? updateAnswer(
            state,
            {
              transcript: event.transcript,
              ...(current?.mode === 'text' ? { rawTranscript: event.transcript } : {}),
            },
            now,
          )
        : state;
    case 'OPEN_DIALOG':
      return { ...state, dialog: event.dialog };
    case 'CLOSE_DIALOG':
      return { ...state, dialog: null };
    case 'CONFIRM_RECORD_AGAIN':
      return kind === 'review'
        ? answering(
            updateAnswer(
              state,
              {
                rawTranscript: '',
                transcript: '',
                timing: { recordingMs: null, firstResultOffsetMs: null, resultOffsetsMs: [] },
                notice: null,
              },
              now,
            ),
            event.now,
            'voice',
          )
        : state;
    case 'SUBMIT': {
      if (
        !['review', 'feedback-error'].includes(kind) ||
        !state.online ||
        !hasWords(current?.transcript ?? '') ||
        !state.session?.feedback.enabled
      )
        return state;
      if (state.session.tokenExpiresAt === null || Date.parse(state.session.tokenExpiresAt) <= now)
        return {
          ...state,
          phase: {
            kind: 'feedback-error',
            code: 'TOKEN_EXPIRED',
            requestId: null,
            sessionCallsRemaining: null,
          },
        };
      return {
        ...updateAnswer(state, { status: 'submitted' }, now),
        phase: { kind: 'submitting', startedAt: event.now },
      };
    }
    case 'FEEDBACK_OK':
      return kind === 'submitting'
        ? {
            ...updateAnswer(
              state,
              { status: 'scored', feedback: event.feedback, feedbackMeta: event.meta },
              now,
            ),
            phase: { kind: 'feedback' },
          }
        : state;
    case 'FEEDBACK_FAILED':
      return kind === 'submitting'
        ? {
            ...updateAnswer(state, { attempts: (current?.attempts ?? 0) + 1 }, now),
            phase: {
              kind: 'feedback-error',
              code: event.code,
              requestId: event.requestId,
              sessionCallsRemaining: event.sessionCallsRemaining,
            },
          }
        : state;
    case 'SAVE_WITHOUT_FEEDBACK':
      return kind === 'review' || kind === 'feedback-error'
        ? { ...updateAnswer(state, { status: 'saved' }, now), phase: { kind: 'saved' } }
        : state;
    case 'CONFIRM_SKIP':
      return ['intro', 'asking', 'thinking', 'answering', 'speech-error', 'review'].includes(kind)
        ? next(updateAnswer(state, { status: 'skipped' }, now), now)
        : state;
    case 'NEXT':
      return kind === 'feedback' || kind === 'saved' ? next(state, now) : state;
    case 'CONFIRM_END':
      return !['loading', 'not-found', 'done'].includes(kind) ? finish(state, now) : state;
    case 'ONLINE':
      return { ...state, online: event.online };
    default: {
      const impossible: never = event;
      return impossible;
    }
  }
}
