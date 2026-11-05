import { expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DIMENSIONS, ROLES, SENIORITIES, QUESTION_TYPES } from '@/lib/config';
import { getBank } from '@/lib/questions/bank';
import { QuestionSchema } from '@/lib/questions/schema';
import { checkBankRules } from '@/lib/questions/coverage';
import { selectQuestions } from '@/lib/questions/select';
import { StartRequestSchema } from '@/lib/api/contracts';
import { MIGRATIONS } from '@/lib/storage/migrations';
import { openDb, closeDb, requestResult, transactionDone } from '@/lib/storage/idb';
import { SessionRecordSchema } from '@/lib/storage/schema';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { buildExport, readImport } from '@/lib/storage/export';
import { record, answer } from '../fixtures/records';
import { startBody } from '../fixtures/api';
it('TC-151 UT-03 every dimension has three eligible unique questions for every role and seniority', () => {
  const bank = getBank().questions;
  expect(checkBankRules(bank)).toEqual([]);
  for (const dimension of DIMENSIONS)
    for (const role of ROLES)
      for (const seniority of SENIORITIES) {
        const input = {
          dimension,
          role,
          seniority,
          types: QUESTION_TYPES,
          length: 3 as const,
          seed: '1234abcd',
        };
        const selected = selectQuestions(bank, input);
        expect(selected).toHaveLength(3);
        expect(new Set(selected.map((q) => q.id)).size).toBe(3);
        expect(
          selected.every(
            (q) =>
              q.dimensions.includes(dimension) &&
              q.roles.includes(role) &&
              q.seniority.includes(seniority),
          ),
        ).toBe(true);
        expect(selectQuestions([...bank].reverse(), input)).toEqual(selected);
      }
  const first = bank[0]!;
  for (const dimensions of [[], ['impact', 'impact'], ['invented']])
    expect(QuestionSchema.safeParse({ ...first, dimensions }).success).toBe(false);
  expect(
    checkBankRules(bank.map((q) => ({ ...q, dimensions: ['clarity' as const] }))).join(),
  ).toContain('dimension coverage:');
  expect(() =>
    selectQuestions([], { ...startBody, seed: '1234abcd', dimension: 'impact' }),
  ).toThrow('exhausted');
  expect(StartRequestSchema.safeParse({ ...startBody, dimension: 'invented' }).success).toBe(false);
  expect(
    StartRequestSchema.safeParse({ ...startBody, dimension: 'impact', length: 5 }).success,
  ).toBe(false);
});
it('TC-151 UT-14/15 v4 history upgrades and dimension setup survives export/import', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = crypto.randomUUID();
  const old = await openDb(name, MIGRATIONS.slice(0, 4));
  const tx = old.transaction(['sessions', 'answers'], 'readwrite');
  tx.objectStore('sessions').put({ ...record, schemaVersion: 4 });
  tx.objectStore('answers').put({ ...answer, schemaVersion: 4 });
  await transactionDone(tx);
  closeDb(old);
  const db = await openDb(name);
  const migrated = SessionRecordSchema.parse(
    await requestResult(db.transaction('sessions').objectStore('sessions').get(record.id)),
  );
  expect(migrated.schemaVersion).toBe(5);
  expect(migrated.setup.dimension).toBeNull();
  expect(migrated.questions).toEqual(record.questions);
  closeDb(db);
  vi.unstubAllGlobals();
  const repo = createMemoryRepository();
  await repo.createSession({ ...record, setup: { ...record.setup, dimension: 'impact' } });
  await repo.putAnswer(answer);
  const exported = await buildExport(repo, 'test', () => new Date(record.createdAt));
  expect(exported.formatVersion).toBe(5);
  const imported = await readImport(new File([JSON.stringify(exported)], 'focused.json'));
  expect(imported.invalid).toBe(0);
  expect(imported.bundles[0]?.session.setup.dimension).toBe('impact');
});
