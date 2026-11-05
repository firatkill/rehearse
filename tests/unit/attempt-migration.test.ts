import { expect, test, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { MIGRATIONS, migrateRecord } from '@/lib/storage/migrations';
import { openDb, closeDb, transactionDone, requestResult } from '@/lib/storage/idb';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { buildExport, readImport } from '@/lib/storage/export';
import {
  AnswerRecordSchema,
  SessionRecordSchema,
  LegacyAnswerRecordSchema,
} from '@/lib/storage/schema';
import { answer, record } from '../fixtures/records';
import { feedback } from '../fixtures/api';
import { completeAttempt } from '@/lib/storage/attempts';
const legacySession = { ...record, schemaVersion: 1 };
const oldAnswer = LegacyAnswerRecordSchema.strip().parse({ ...answer, schemaVersion: 1 });
const legacyAnswer = { ...oldAnswer, schemaVersion: 1, status: 'scored', feedback };

test('TC-147 UT-14 actual v1 database upgrades without losing completed answers or drafts', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = crypto.randomUUID();
  const first = await openDb(name, MIGRATIONS.slice(0, 1));
  const tx = first.transaction(['sessions', 'answers'], 'readwrite');
  tx.objectStore('sessions').put(legacySession);
  tx.objectStore('answers').put(legacyAnswer);
  tx.objectStore('answers').put({
    ...legacyAnswer,
    index: 1,
    questionId: record.questions[1]?.id,
    status: 'draft',
    feedback: null,
  });
  await transactionDone(tx);
  closeDb(first);
  const upgraded = await openDb(name);
  const read = upgraded.transaction(['sessions', 'answers'], 'readonly');
  const session = SessionRecordSchema.parse(
    await requestResult(read.objectStore('sessions').get(record.id)),
  );
  const completed = AnswerRecordSchema.parse(
    await requestResult(read.objectStore('answers').get([record.id, 0])),
  );
  const draft = AnswerRecordSchema.parse(
    await requestResult(read.objectStore('answers').get([record.id, 1])),
  );
  expect(session.schemaVersion).toBe(4);
  expect(completed.attemptRecords[0]?.transcript).toBe(answer.transcript);
  expect(completed.bestAttemptId).toBe(completed.attemptRecords[0]?.id);
  expect(draft.transcript).toBe(answer.transcript);
  expect(draft.attemptRecords).toEqual([]);
  closeDb(upgraded);
});

test('TC-147 UT-15 old export migrates and new attempts round-trip', async () => {
  const imported = await readImport(
    new File(
      [
        JSON.stringify({
          format: 'rehearse-export',
          formatVersion: 1,
          exportedAt: record.createdAt,
          appVersion: '1',
          sessions: [{ session: legacySession, answers: [legacyAnswer] }],
        }),
      ],
      'old.json',
    ),
  );
  expect(imported.invalid).toBe(0);
  const bundle = imported.bundles[0];
  expect(bundle?.answers[0]?.attemptRecords).toHaveLength(1);
  const repo = createMemoryRepository();
  if (!bundle) throw new Error('Expected migrated bundle');
  await repo.createSession(bundle.session);
  for (const a of bundle.answers) await repo.putAnswer(a);
  const exported = await buildExport(repo, '2', () => new Date(record.createdAt));
  expect(exported.formatVersion).toBe(4);
  const roundtrip = await readImport(new File([JSON.stringify(exported)], 'new.json'));
  expect(roundtrip.bundles[0]?.answers).toEqual(bundle.answers);
  expect(migrateRecord({ schemaVersion: 1, malformed: true })).toBeNull();
});

test('TC-148 UT-14 v2 attempt history upgrades without inventing new feedback metadata', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = crypto.randomUUID();
  const historicFeedback = {
    ...feedback,
    improvements: feedback.improvements.map(({ point, why, rewrite }) => ({ point, why, rewrite })),
  };
  const withCurrentFields = completeAttempt({
    ...answer,
    schemaVersion: 2,
    status: 'scored',
    feedback: historicFeedback,
  });
  const { followUp: _working, followUpRecords: _history, ...historicAnswer } = withCurrentFields;
  expect(_working).toBeNull();
  expect(_history).toEqual([]);
  const first = await openDb(name, MIGRATIONS.slice(0, 2));
  const write = first.transaction(['sessions', 'answers'], 'readwrite');
  write.objectStore('sessions').put({ ...record, schemaVersion: 2 });
  write.objectStore('answers').put(historicAnswer);
  await transactionDone(write);
  closeDb(first);
  const upgraded = await openDb(name);
  const stored = AnswerRecordSchema.parse(
    await requestResult(upgraded.transaction('answers').objectStore('answers').get([record.id, 0])),
  );
  expect(stored).toEqual({
    ...historicAnswer,
    schemaVersion: 4,
    followUp: null,
    followUpRecords: [],
  });
  expect(stored.attemptRecords[0]?.feedback?.improvements[0]).not.toHaveProperty('dimension');
  closeDb(upgraded);
  const imported = await readImport(
    new File(
      [
        JSON.stringify({
          format: 'rehearse-export',
          formatVersion: 2,
          exportedAt: record.createdAt,
          appVersion: '2',
          sessions: [{ session: { ...record, schemaVersion: 2 }, answers: [historicAnswer] }],
        }),
      ],
      'v2.json',
    ),
  );
  expect(imported.invalid).toBe(0);
  expect(imported.bundles[0]?.answers[0]).toEqual(stored);
});
