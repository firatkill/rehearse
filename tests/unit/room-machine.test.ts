import { expect, it } from 'vitest';
import {
  initialRoomState,
  roomReducer,
  resumePhase,
  type RoomState,
  type Phase,
  type RoomEvent,
} from '@/lib/room/machine';
import { record, answer } from '../fixtures/records';
import { feedback } from '../fixtures/api';
import type { SessionRecord } from '@/lib/storage/schema';

const now = Date.parse('2026-10-21T12:30:00Z');
function state(phase: Phase = { kind: 'intro' }, voice = false): RoomState {
  return {
    ...initialRoomState,
    session: {
      ...record,
      currentMode: voice ? 'voice' : 'text',
      setup: { ...record.setup, mode: voice ? 'voice' : 'text' },
    },
    phase,
    mode: voice ? 'voice' : 'text',
    answers: [{ ...answer, mode: voice ? 'voice' : 'text', status: 'review' }],
  };
}
const reduce = (s: RoomState, e: RoomEvent) => roomReducer(s, e, now);
it('TC-035 UT-18 loads records, handles not-found and starts questions', () => {
  expect(reduce(initialRoomState, { type: 'NOT_FOUND' }).phase.kind).toBe('not-found');
  const loaded = reduce(initialRoomState, { type: 'LOADED', session: record, answers: [] });
  expect(loaded.phase.kind).toBe('intro');
  expect(reduce(loaded, { type: 'START_INTERVIEW' }).phase).toEqual({
    kind: 'thinking',
    remainingMs: 15000,
    paused: false,
    wasPaused: false,
  });
  const aloud = { ...loaded, session: { ...record, setup: { ...record.setup, readAloud: true } } };
  expect(reduce(aloud, { type: 'START_INTERVIEW' }).phase).toEqual({
    kind: 'asking',
    interrupted: false,
  });
  for (const [result, error] of [
    ['denied', 'permission'],
    ['no-device', 'no-device'],
    ['error', 'unavailable'],
  ] as const)
    expect(reduce(state({ kind: 'intro' }, true), { type: 'MIC_CHECKED', result }).phase).toEqual({
      kind: 'speech-error',
      error,
    });
  expect(reduce(loaded, { type: 'MIC_CHECKED', result: 'granted' }).phase.kind).toBe('thinking');
});
it('TC-035 UT-18 reading completion, replay and visibility follow the transition table', () => {
  const asking = state({ kind: 'asking', interrupted: false });
  for (const result of ['ended', 'error', 'skipped'] as const)
    expect(reduce(asking, { type: 'TTS_DONE', result }).phase.kind).toBe('thinking');
  expect(reduce(asking, { type: 'TTS_DONE', result: 'cancelled' })).toBe(asking);
  expect(reduce(asking, { type: 'STOP_READING' }).phase.kind).toBe('thinking');
  const hidden = reduce(asking, { type: 'VISIBILITY', hidden: true });
  expect(hidden.phase).toEqual({ kind: 'asking', interrupted: true });
  expect(reduce(hidden, { type: 'REPLAY' }).phase).toEqual({ kind: 'asking', interrupted: false });
  expect(reduce(asking, { type: 'START_ANSWERING', now }).phase).toEqual({
    kind: 'answering',
    startedAt: now,
    answerMode: 'text',
  });
  for (const phase of [
    { kind: 'review', notice: null },
    { kind: 'feedback' },
    { kind: 'saved' },
  ] as const) {
    const s = state(phase);
    expect(reduce(s, { type: 'REPLAY' })).toBe(s);
  }
});
it('TC-035 UT-18 think timer pauses, resumes and enters answering with the injected clock', () => {
  let s = reduce(state(), { type: 'START_INTERVIEW' });
  s = reduce(s, { type: 'THINK_TICK', elapsedMs: 1000 });
  expect(s.phase).toMatchObject({ remainingMs: 14000 });
  s = reduce(s, { type: 'VISIBILITY', hidden: true });
  expect(reduce(s, { type: 'THINK_TICK', elapsedMs: 10000 })).toBe(s);
  s = reduce(s, { type: 'VISIBILITY', hidden: false });
  expect(s.phase).toMatchObject({ paused: false, wasPaused: true });
  expect(reduce(s, { type: 'REPLAY' }).phase.kind).toBe('asking');
  expect(reduce(s, { type: 'THINK_TICK', elapsedMs: 14000 }).phase).toEqual({
    kind: 'answering',
    startedAt: now,
    answerMode: 'text',
  });
  expect(reduce(s, { type: 'START_ANSWERING', now: now + 1 }).phase).toMatchObject({
    startedAt: now + 1,
  });
});
it('TC-035 UT-18 voice stop notices and failures preserve the transcript', () => {
  const s = state({ kind: 'answering', startedAt: now, answerMode: 'voice' }, true);
  for (const reason of [
    'user',
    'time_limit',
    'char_cap',
    'tab_hidden',
    'network',
    'unexpected_stop',
  ] as const) {
    const next = reduce(s, {
      type: 'RECORDER_STOPPED',
      reason,
      rawTranscript: 'My answer',
      timing: answer.timing,
    });
    expect(next.phase).toEqual({ kind: 'review', notice: reason === 'user' ? null : reason });
    expect(next.answers[0]).toMatchObject({
      status: 'review',
      rawTranscript: 'My answer',
      transcript: 'My answer',
    });
  }
  const failed = reduce(s, {
    type: 'RECORDER_FAILED',
    fail: 'no-speech',
    rawTranscript: 'Partial answer',
  });
  expect(failed.phase).toEqual({ kind: 'speech-error', error: 'no-speech' });
  expect(failed.answers[0]?.transcript).toBe('Partial answer');
  const retry = reduce(failed, { type: 'RETRY_RECORDING', now });
  expect(retry.phase).toMatchObject({ kind: 'answering', answerMode: 'voice' });
  expect(retry.answers[0]?.transcript).toBe('Partial answer');
  const text = reduce(failed, { type: 'TYPE_INSTEAD' });
  expect(text.mode).toBe('text');
  expect(text.session?.currentMode).toBe('text');
  expect(text.answers[0]?.transcript).toBe('Partial answer');
  expect(reduce(s, { type: 'TYPE_INSTEAD' }).phase).toMatchObject({
    kind: 'answering',
    answerMode: 'text',
  });
});
it('TC-035 UT-18 Type instead preserves the asking/thinking phase', () => {
  for (const phase of [
    { kind: 'asking', interrupted: false },
    { kind: 'thinking', remainingMs: 15000, paused: false, wasPaused: false },
  ] as const) {
    const s = state(phase, true);
    const next = reduce(s, { type: 'TYPE_INSTEAD' });
    expect(next.phase).toEqual(phase);
    expect(next.mode).toBe('text');
    expect(next.session?.currentMode).toBe('text');
  }
});
it('TC-035 UT-18 text review, edit and record-again update records and dialogs', () => {
  let s = state({ kind: 'answering', startedAt: now, answerMode: 'text' });
  s = reduce(s, { type: 'TEXT_REVIEW', transcript: 'Typed answer' });
  expect(s.phase).toEqual({ kind: 'review', notice: null });
  expect(s.answers[0]).toMatchObject({
    rawTranscript: 'Typed answer',
    transcript: 'Typed answer',
    status: 'review',
  });
  s = reduce(s, { type: 'EDIT', transcript: 'Edited answer' });
  expect(s.answers[0]).toMatchObject({
    rawTranscript: 'Edited answer',
    transcript: 'Edited answer',
  });
  expect(s.answers[0]?.metrics).toMatchObject({ words: 2, fillers: { total: 0 } });
  const voice = reduce(state({ kind: 'review', notice: null }, true), {
    type: 'EDIT',
    transcript: 'Edited voice',
  });
  expect(voice.answers[0]?.rawTranscript).toBe(answer.rawTranscript);
  s = reduce(voice, { type: 'OPEN_DIALOG', dialog: 'record-again' });
  expect(s.dialog).toBe('record-again');
  expect(reduce(s, { type: 'CLOSE_DIALOG' }).dialog).toBeNull();
  const restarted = reduce(s, { type: 'CONFIRM_RECORD_AGAIN', now });
  expect(restarted.phase).toMatchObject({ kind: 'answering', answerMode: 'voice' });
  expect(restarted.answers[0]).toMatchObject({
    transcript: '',
    rawTranscript: '',
    timing: { recordingMs: null, firstResultOffsetMs: null, resultOffsetsMs: [] },
  });
  expect(restarted.dialog).toBeNull();
});
it('TC-036 UT-18 guards offline, empty, feedback-off and expired-token submissions', () => {
  const review = state({ kind: 'review', notice: null });
  const offline = reduce(review, { type: 'ONLINE', online: false });
  expect(reduce(offline, { type: 'SUBMIT', now })).toBe(offline);
  for (const transcript of ['', '  ', '...!?']) {
    const empty = { ...review, answers: [{ ...answer, transcript }] };
    expect(reduce(empty, { type: 'SUBMIT', now })).toBe(empty);
  }
  const disabled = {
    ...review,
    session: { ...record, feedback: { enabled: false, reason: 'practice' as const } },
  };
  expect(reduce(disabled, { type: 'SUBMIT', now })).toBe(disabled);
  const expired = {
    ...review,
    session: { ...record, tokenExpiresAt: new Date(now).toISOString() },
  };
  expect(reduce(expired, { type: 'SUBMIT', now }).phase).toEqual({
    kind: 'feedback-error',
    code: 'TOKEN_EXPIRED',
    requestId: null,
    sessionCallsRemaining: null,
  });
  const submitted = reduce(review, { type: 'SUBMIT', now });
  expect(submitted.phase).toEqual({ kind: 'submitting', startedAt: now });
  expect(submitted.answers[0]?.status).toBe('submitted');
});
it('TC-035 UT-18 feedback success/failure, retries, save-only and next are terminal transitions', () => {
  const submitting = reduce(state({ kind: 'review', notice: null }), { type: 'SUBMIT', now });
  const failure = reduce(submitting, {
    type: 'FEEDBACK_FAILED',
    code: 'PROVIDER_ERROR',
    requestId: 'req',
    sessionCallsRemaining: 3,
  });
  expect(failure.phase).toMatchObject({ kind: 'feedback-error', code: 'PROVIDER_ERROR' });
  expect(failure.answers[0]?.attempts).toBe(1);
  expect(reduce(failure, { type: 'SUBMIT', now }).phase.kind).toBe('submitting');
  const success = reduce(submitting, {
    type: 'FEEDBACK_OK',
    feedback,
    meta: { model: 'mock', promptVersion: 'feedback-v1', latencyMs: 10, costUsd: 0 },
  });
  expect(success.phase.kind).toBe('feedback');
  expect(success.answers[0]?.status).toBe('scored');
  expect(reduce(success, { type: 'NEXT' }).index).toBe(1);
  for (const s of [failure, state({ kind: 'review', notice: null })]) {
    const saved = reduce(s, { type: 'SAVE_WITHOUT_FEEDBACK' });
    expect(saved.phase.kind).toBe('saved');
    expect(saved.answers[0]?.status).toBe('saved');
    expect(reduce(saved, { type: 'NEXT' }).index).toBe(1);
  }
});
it('TC-035 UT-18 skipping advances, completion records terminal status and ending early is distinct', () => {
  let s: RoomState = { ...state(), answers: [] };
  for (let i = 0; i < 3; i++) {
    s = reduce(s, { type: 'CONFIRM_SKIP' });
  }
  expect(s.phase.kind).toBe('done');
  expect(s.session).toMatchObject({
    status: 'completed',
    completedAt: new Date(now).toISOString(),
    checkpoint: { phase: 'done' },
  });
  expect(s.answers.map((a) => a.status)).toEqual(['skipped', 'skipped', 'skipped']);
  const ended = reduce(state(), { type: 'CONFIRM_END' });
  expect(ended.session?.status).toBe('ended_early');
  expect(ended.phase.kind).toBe('done');
  const last = {
    ...state({ kind: 'saved' }),
    index: 2,
    answers: [0, 1, 2].map((index) => ({ ...answer, index, status: 'saved' as const })),
  };
  expect(reduce(last, { type: 'NEXT' }).session?.status).toBe('completed');
  expect(reduce(last, { type: 'CONFIRM_END' }).session?.status).toBe('completed');
});
it.each([
  'intro',
  'asking',
  'thinking',
  'answering',
  'review',
  'submitting',
  'feedback',
  'done',
] as const)('TC-035 UT-18 recovers %s checkpoints', (phase) => {
  const session: SessionRecord = { ...record, checkpoint: { ...record.checkpoint, phase } };
  const expected = {
    intro: 'intro',
    asking: 'intro',
    thinking: 'intro',
    answering: 'review',
    review: 'review',
    submitting: 'review',
    feedback: 'saved',
    done: 'done',
  }[phase];
  expect(resumePhase(session, [answer]).kind).toBe(expected);
  const loaded = reduce(initialRoomState, { type: 'LOADED', session, answers: [answer] });
  expect(loaded.restoredNotice).toBe(phase === 'asking' || phase === 'thinking');
});
it('TC-035 UT-18 empty drafts resume behind a gesture; scored and completed sessions recover correctly', () => {
  const session = { ...record, checkpoint: { ...record.checkpoint, phase: 'answering' as const } };
  expect(resumePhase(session, []).kind).toBe('intro');
  expect(resumePhase(session, [{ ...answer, transcript: '' }]).kind).toBe('intro');
  expect(
    resumePhase({ ...record, checkpoint: { ...record.checkpoint, phase: 'feedback' } }, [
      { ...answer, status: 'scored' },
    ]).kind,
  ).toBe('feedback');
  expect(resumePhase({ ...record, status: 'completed' }, []).kind).toBe('done');
});
