import { expect, test } from 'vitest';
import { completeAttempt, bestAnswer } from '@/lib/storage/attempts';
import { AnswerRecordSchema } from '@/lib/storage/schema';
import { initialRoomState, roomReducer, type RoomState } from '@/lib/room/machine';
import { answer, record } from '../fixtures/records';
import { feedback } from '../fixtures/api';
const now = Date.parse('2026-10-21T12:30:00Z');
const meta = { model: 'mock', promptVersion: 'test', latencyMs: 1, costUsd: 0 };

test('TC-146 retry preserves prior responses and selects earliest highest score', () => {
  let state: RoomState = {
    ...initialRoomState,
    session: record,
    index: 0,
    answers: [{ ...answer, status: 'submitted' }],
    phase: { kind: 'submitting', startedAt: now },
  };
  state = roomReducer(state, { type: 'FEEDBACK_OK', feedback, meta }, now);
  const first = state.answers[0];
  expect(first?.attemptRecords).toHaveLength(1);
  expect(first?.attemptRecords[0]?.transcript).toBe(answer.transcript);
  state = roomReducer(state, { type: 'RETRY_ANSWER' }, now + 1);
  expect(state.phase.kind).toBe('answering');
  expect(state.answers[0]?.transcript).toBe('');
  expect(state.answers[0]?.feedback).toBeNull();
  expect(state.answers[0]?.attemptRecords).toEqual(first?.attemptRecords);
  state = roomReducer(
    state,
    { type: 'TEXT_REVIEW', transcript: 'I made a new answer with measured results.' },
    now + 2,
  );
  state = roomReducer(state, { type: 'SUBMIT', now: now + 3 }, now + 3);
  state = roomReducer(state, { type: 'FEEDBACK_OK', feedback, meta }, now + 4);
  const second = state.answers[0];
  expect(second?.attemptRecords).toHaveLength(2);
  expect(second?.bestAttemptId).toBe(first?.bestAttemptId);
  expect(second && bestAnswer(second).transcript).toBe(answer.transcript);
  expect(AnswerRecordSchema.safeParse(second).success).toBe(true);
});

test('TC-147 validates ownership, order, status and best-attempt reference', () => {
  const saved = completeAttempt(answer);
  expect(saved.bestAttemptId).toBeNull();
  const scored = completeAttempt({ ...saved, status: 'scored', feedback, feedbackMeta: meta });
  expect(bestAnswer(scored).feedback).toEqual(feedback);
  expect(AnswerRecordSchema.safeParse(scored).success).toBe(true);
  const attempt = scored.attemptRecords[0];
  expect(AnswerRecordSchema.safeParse({ ...scored, bestAttemptId: 'foreign' }).success).toBe(false);
  for (const patch of [
    { sessionId: crypto.randomUUID() },
    { ordinal: 4 },
    { id: 'foreign' },
    { status: 'scored', feedback: null },
  ]) {
    expect(
      AnswerRecordSchema.safeParse({
        ...scored,
        attemptRecords: [{ ...attempt, ...patch }, scored.attemptRecords[1]],
      }).success,
    ).toBe(false);
  }
  expect(completeAttempt({ ...answer, status: 'draft' }).attemptRecords).toEqual([]);
});

test('TC-146 a better attempt is selected while an unfinished retry retains the previous best', () => {
  const first = completeAttempt({
    ...answer,
    status: 'scored',
    feedback: { ...feedback, overall: 2 },
  });
  const second = completeAttempt({
    ...first,
    transcript: 'Better answer.',
    feedback: { ...feedback, overall: 4 },
  });
  expect(second.bestAttemptId).toBe(second.attemptRecords[1]?.id);
  expect(bestAnswer(second).transcript).toBe('Better answer.');
  const draft = { ...second, status: 'draft' as const, transcript: 'Unfinished', feedback: null };
  expect(bestAnswer(draft).transcript).toBe('Better answer.');
});
