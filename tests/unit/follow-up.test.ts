import { expect, test, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { signFollowUp, verifyFollowUp } from '@/lib/session/follow-up';
import { type TokenPayload } from '@/lib/session/token';
import { reportMarkdown } from '@/lib/report/markdown';
import { completeAttempt, bestAnswer } from '@/lib/storage/attempts';
import { AnswerRecordSchema } from '@/lib/storage/schema';
import { initialRoomState, roomReducer, type RoomState } from '@/lib/room/machine';
import { MIGRATIONS } from '@/lib/storage/migrations';
import { openDb, closeDb, transactionDone, requestResult } from '@/lib/storage/idb';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { buildExport, readImport } from '@/lib/storage/export';
import { answer, record } from '../fixtures/records';
import { feedback } from '../fixtures/api';
const now = Date.parse('2026-10-21T12:30:00Z');
const meta = {
  model: 'mock',
  promptVersion: 'test',
  latencyMs: 1,
  costUsd: 0,
  followUpToken: 'proof',
};
function scored() {
  return completeAttempt({ ...answer, status: 'scored' as const, feedback, feedbackMeta: meta });
}
const payload: TokenPayload = {
  v: 1,
  sid: record.id,
  iat: now / 1000,
  exp: now / 1000 + 7200,
  fb: 5,
  sm: 2,
  q: record.questions.map((q) => q.id),
  r: record.setup.role,
  s: record.setup.seniority,
  b: record.bankVersion,
};
test('TC-149 proof binds the session, question, expiry and secret and rejects tampering', () => {
  const proof = signFollowUp(payload, 0, feedback.follow_up_question, 'secret');
  expect(verifyFollowUp(proof, ['new', 'secret'], payload, 0, now / 1000)).toEqual({
    ok: true,
    prompt: feedback.follow_up_question,
  });
  expect(verifyFollowUp(proof, ['secret'], payload, 0, payload.exp)).toEqual({
    ok: false,
    code: 'TOKEN_EXPIRED',
  });
  for (const token of [
    proof + '.extra',
    'x'.repeat(2001),
    proof.replace('rf1.', 'rh1.'),
    proof.slice(0, -4) + 'xxxx',
    'rf1..x',
  ])
    expect(verifyFollowUp(token, ['secret'], payload, 0, now / 1000).ok).toBe(false);
  expect(verifyFollowUp(proof, ['wrong'], payload, 0, now / 1000).ok).toBe(false);
  expect(verifyFollowUp(proof, ['secret'], payload, 1, now / 1000)).toEqual({
    ok: false,
    code: 'TOKEN_SCOPE',
  });
  expect(
    verifyFollowUp(proof, ['secret'], { ...payload, sid: crypto.randomUUID() }, 0, now / 1000),
  ).toEqual({ ok: false, code: 'TOKEN_SCOPE' });
});
test('TC-149 follow-up saves separately, preserves best original and rejects forged parents', async () => {
  const main = scored();
  let state: RoomState = {
    ...initialRoomState,
    session: record,
    answers: [main],
    phase: { kind: 'feedback' },
  };
  state = roomReducer(
    state,
    { type: 'FOLLOW_UP', parentAttemptId: main.attemptRecords[0]!.id },
    now,
  );
  expect(state.phase.kind).toBe('thinking');
  expect(state.answers[0]?.transcript).toBe('');
  state = roomReducer(state, { type: 'START_ANSWERING', now }, now);
  state = roomReducer(
    state,
    {
      type: 'TEXT_REVIEW',
      transcript: 'I compared the weekly dashboard before and after the change.',
    },
    now,
  );
  state = roomReducer(state, { type: 'SUBMIT', now }, now);
  state = roomReducer(
    state,
    {
      type: 'FEEDBACK_OK',
      feedback: { ...feedback, overall: 4 },
      meta: { ...meta, followUpToken: null },
    },
    now,
  );
  const current = AnswerRecordSchema.parse(state.answers[0]);
  expect(current.attemptRecords).toHaveLength(1);
  expect(current.followUpRecords).toHaveLength(1);
  expect(current.followUpRecords[0]?.parentAttemptId).toBe(main.bestAttemptId);
  expect(bestAnswer(current).feedback?.overall).toBe(3);
  expect(
    AnswerRecordSchema.safeParse({
      ...current,
      followUpRecords: [{ ...current.followUpRecords[0], parentAttemptId: 'forged' }],
    }).success,
  ).toBe(false);
  expect(reportMarkdown(record, [current])).toContain('#### Follow-up 1:');
  expect(reportMarkdown(record, [current])).not.toContain('proof');
  const repo = createMemoryRepository();
  await repo.createSession(record);
  await repo.putAnswer(current);
  const exported = await buildExport(repo, 'test', () => new Date(now));
  expect(JSON.stringify(exported)).not.toContain('proof');
  const imported = await readImport(new File([JSON.stringify(exported)], 'follow-up.json'));
  expect(imported.invalid).toBe(0);
  expect(imported.bundles[0]?.answers[0]?.followUpRecords[0]?.transcript).toBe(current.transcript);
  expect(imported.bundles[0]?.answers[0]?.followUp?.token).toBeNull();
  const retry = roomReducer(state, { type: 'RETRY_ANSWER' }, now);
  expect(retry.answers[0]?.followUp).toBeNull();
  expect(retry.answers[0]?.followUpRecords).toEqual(current.followUpRecords);
});
test('TC-149 UT-14 v3 database gains empty follow-up history without changing prior attempts', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = crypto.randomUUID();
  const main = scored();
  const { followUp: _working, followUpRecords: _history, ...prior } = main;
  expect(_working).toBeNull();
  expect(_history).toEqual([]);
  const old = await openDb(name, MIGRATIONS.slice(0, 3));
  const tx = old.transaction(['sessions', 'answers'], 'readwrite');
  tx.objectStore('sessions').put({ ...record, schemaVersion: 3 });
  tx.objectStore('answers').put({ ...prior, schemaVersion: 3 });
  await transactionDone(tx);
  closeDb(old);
  const current = await openDb(name);
  const migrated = AnswerRecordSchema.parse(
    await requestResult(current.transaction('answers').objectStore('answers').get([record.id, 0])),
  );
  expect(migrated).toEqual(main);
  closeDb(current);
  vi.unstubAllGlobals();
});
