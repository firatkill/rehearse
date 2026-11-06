import { expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { STORAGE } from '@/lib/config';
import { MIGRATIONS, migrateRecord } from '@/lib/storage/migrations';
import { closeDb, openDb, requestResult, transactionDone } from '@/lib/storage/idb';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { buildExport, readImport } from '@/lib/storage/export';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { openSqlite, createSqliteRepository } from '@/lib/storage/sqlite/repository';
import { signToken, verifyToken, TokenPayloadSchema } from '@/lib/session/token';
import { StartRequestSchema } from '@/lib/api/contracts';
import { record, answer } from '../fixtures/records';
import { startBody } from '../fixtures/api';

function oldSession() {
  const { language, ...setup } = record.setup;
  expect(language).toBe('en');
  return { ...record, schemaVersion: 5, setup };
}
it('TC-205 UT-14 IDB v7 records gain English without losing answers; Turkish survives export/import', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = crypto.randomUUID();
  const old = await openDb(name, MIGRATIONS.slice(0, 7));
  const write = old.transaction(['sessions', 'answers'], 'readwrite');
  write.objectStore('sessions').put(oldSession());
  write.objectStore('answers').put({ ...answer, schemaVersion: 5 });
  await transactionDone(write);
  closeDb(old);
  const db = await openDb(name);
  try {
    const current = SessionRecordSchema.parse(
      await requestResult(db.transaction('sessions').objectStore('sessions').get(record.id)),
    );
    expect(current).toEqual(record);
    expect(
      AnswerRecordSchema.parse(
        await requestResult(db.transaction('answers').objectStore('answers').get([record.id, 0])),
      ),
    ).toEqual(answer);
    const repo = createMemoryRepository();
    await repo.createSession({ ...current, setup: { ...current.setup, language: 'tr' } });
    await repo.putAnswer(answer);
    const exported = await buildExport(repo, 'test', () => new Date(record.createdAt));
    expect(exported.formatVersion).toBe(STORAGE.EXPORT_FORMAT_VERSION);
    const imported = await readImport(new File([JSON.stringify(exported)], 'turkish.json'));
    expect(imported.invalid).toBe(0);
    expect(imported.bundles[0]?.session.setup.language).toBe('tr');
    expect(imported.bundles[0]?.answers).toEqual([answer]);
  } finally {
    closeDb(db);
    vi.unstubAllGlobals();
  }
});
it('TC-205 UT-14 legacy SQLite reads and export v7 preserve data and default to English', async () => {
  const db = openSqlite(':memory:');
  try {
    db.prepare('INSERT INTO sessions (id, value) VALUES (?, ?)').run(
      record.id,
      JSON.stringify(oldSession()),
    );
    const repo = createSqliteRepository(db);
    expect(await repo.getSession(record.id)).toEqual(record);
    const imported = await readImport(
      new File(
        [
          JSON.stringify({
            format: 'rehearse-export',
            formatVersion: 7,
            exportedAt: record.createdAt,
            appVersion: '2.0.0',
            sessions: [{ session: oldSession(), answers: [{ ...answer, schemaVersion: 5 }] }],
            jobPosts: [],
            generatedQuestions: [],
          }),
        ],
        'legacy.json',
      ),
    );
    expect(imported.invalid).toBe(0);
    expect(imported.bundles[0]?.session).toEqual({
      ...record,
      origin: 'import',
      token: null,
      tokenExpiresAt: null,
      feedback: { enabled: false, reason: 'practice' },
    });
    expect(
      migrateRecord({ ...oldSession(), setup: { ...oldSession().setup, language: 'xx' } }),
    ).toBeNull();
  } finally {
    db.close();
  }
});
it('TC-205 TC-206 language is validated at setup and signed-token boundaries; old English tokens remain valid', () => {
  expect(StartRequestSchema.parse({ ...startBody, language: 'tr' }).language).toBe('tr');
  expect(StartRequestSchema.safeParse({ ...startBody, language: 'fr' }).success).toBe(false);
  const payload = TokenPayloadSchema.parse({
    v: 1,
    sid: record.id,
    iat: 100,
    exp: 200,
    fb: 5,
    sm: 2,
    q: record.questions.map((q) => q.id),
    r: record.setup.role,
    s: record.setup.seniority,
    b: record.bankVersion,
  });
  const secret = 'test-session-language-secret'.repeat(3);
  expect(verifyToken(signToken(payload, secret), [secret], 150)).toEqual({ ok: true, payload });
  const turkish = { ...payload, l: 'tr' as const };
  expect(verifyToken(signToken(turkish, secret), [secret], 150)).toEqual({
    ok: true,
    payload: turkish,
  });
  expect(TokenPayloadSchema.safeParse({ ...payload, l: 'fr' }).success).toBe(false);
});
