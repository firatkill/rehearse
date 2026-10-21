import { IDBFactory, IDBKeyRange, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '../fixtures/export-v1.json';
import { ExportFileSchema, SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { createIndexedDbRepository } from '@/lib/storage/idb-repository';
import { openDb } from '@/lib/storage/idb';
import { migrateExport, readImport, ImportFileError } from '@/lib/storage/export';
import { HTTP, ANSWER } from '@/lib/config';
import { getBank } from '@/lib/questions/bank';
import { toSnapshot } from '@/lib/questions/schema';
const exportFile = ExportFileSchema.parse(fixture);
const bundle = exportFile.sessions[0];
if (!bundle) throw new Error('Fixture missing');
const first = bundle;
const file = (value: unknown) =>
  new File([JSON.stringify(value)], 'rehearse-export.json', { type: 'application/json' });
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe.each(['memory', 'indexeddb'] as const)('%s export/import', (kind) => {
  const create = async () =>
    kind === 'memory'
      ? createMemoryRepository()
      : createIndexedDbRepository(await openDb(crypto.randomUUID()));
  it('TC-099 UT-15 round-trips, strips tokens, disables imported in-progress feedback and skips duplicates', async () => {
    const source = await create();
    const session = SessionRecordSchema.parse({
      ...first.session,
      status: 'in_progress',
      origin: 'live',
      token: 'non-portable-test-token',
      tokenExpiresAt: '2026-10-21T14:00:00.000Z',
      feedback: { enabled: true, reason: null },
    });
    await source.createSession(session);
    for (const answer of first.answers) await source.putAnswer(answer);
    const exported = await source.exportAll('0.1.0');
    expect(exported.sessions[0]?.session).toMatchObject({ token: null, tokenExpiresAt: null });
    const target = await create();
    expect(await target.importAll(file(exported))).toEqual({ imported: 1, skipped: 0, invalid: 0 });
    expect(await target.getSession(session.id)).toMatchObject({
      origin: 'import',
      feedback: { enabled: false, reason: 'practice' },
      token: null,
      tokenExpiresAt: null,
    });
    expect(await target.getAnswers(session.id)).toEqual(first.answers);
    expect(await target.importAll(file(exported))).toEqual({ imported: 0, skipped: 1, invalid: 0 });
  });
  it('TC-100 UT-15 counts invalid bundles without partially importing answers or overwriting other sessions', async () => {
    const target = await create();
    const foreign = {
      ...first,
      answers: first.answers.map((answer) => ({ ...answer, sessionId: crypto.randomUUID() })),
    };
    const duplicate = { ...first, answers: [first.answers[0], first.answers[0]] };
    const result = await target.importAll(
      file({
        ...exportFile,
        sessions: [{ session: { id: 'invalid' }, answers: [] }, foreign, duplicate, first],
      }),
    );
    expect(result).toEqual({ imported: 1, skipped: 0, invalid: 3 });
    expect((await target.listSessions()).sessions).toHaveLength(1);
    expect(await target.getAnswers(first.session.id)).toEqual(first.answers);
    expect(
      await target.importAll(
        file({ ...exportFile, sessions: [{ session: first.session, answers: 'invalid' }, null] }),
      ),
    ).toEqual({ imported: 0, skipped: 0, invalid: 2 });
  });
  it('TC-099 UT-15 concurrent duplicate imports create one bundle', async () => {
    const repo = await create();
    const results = await Promise.all([
      repo.importAll(file(exportFile)),
      repo.importAll(file(exportFile)),
    ]);
    expect(results.reduce((n, result) => n + result.imported, 0)).toBe(1);
    expect(results.reduce((n, result) => n + result.skipped, 0)).toBe(1);
    expect(await repo.getAnswers(first.session.id)).toHaveLength(first.answers.length);
  });
  it('TC-099 UT-15 exports newest-first with the current app version', async () => {
    const repo = await create();
    await repo.createSession(first.session);
    const newer = {
      ...first.session,
      id: crypto.randomUUID(),
      createdAt: '2026-10-22T00:00:00.000Z',
    };
    await repo.createSession(newer);
    const output = await repo.exportAll('test-version');
    expect(output.appVersion).toBe('test-version');
    expect(output.sessions.map((item) => item.session.id)).toEqual([newer.id, first.session.id]);
  });
});
it('TC-100 UT-15 rejects oversize before reading and maps format/newer errors', async () => {
  const huge = new File(['x'.repeat(HTTP.IMPORT_MAX_BYTES + 1)], 'large.json');
  const read = vi.spyOn(huge, 'text');
  await expect(readImport(huge)).rejects.toMatchObject({
    kind: 'size',
    message: 'That file is larger than 5 MB.',
  });
  expect(read).not.toHaveBeenCalled();
  for (const input of [
    new File(['{'], 'bad.json'),
    file({}),
    file({ ...exportFile, format: 'other' }),
    file({ ...exportFile, exportedAt: 'invalid' }),
    file({ ...exportFile, sessions: Array(1001).fill(null) }),
  ])
    await expect(readImport(input)).rejects.toMatchObject({ kind: 'format' });
  await expect(readImport(file({ ...exportFile, formatVersion: 2 }))).rejects.toMatchObject({
    kind: 'newer',
  });
});
it('TC-100 UT-15 ordered export migrations reject missing or non-advancing transforms', () => {
  expect(
    migrateExport(exportFile, 3, {
      1: (value) => ({ ...(value as object), formatVersion: 2 }),
      2: (value) => ({ ...(value as object), formatVersion: 3 }),
    }),
  ).toMatchObject({ formatVersion: 3 });
  expect(() => migrateExport(exportFile, 2)).toThrow(ImportFileError);
  expect(() =>
    migrateExport(exportFile, 3, { 1: (value) => ({ ...(value as object), formatVersion: 3 }) }),
  ).toThrow(ImportFileError);
  expect(() => migrateExport(exportFile, 2, { 1: (value) => value })).toThrow(ImportFileError);
  expect(() => migrateExport(exportFile, 2, { 1: () => null })).toThrow(ImportFileError);
  expect(() =>
    migrateExport(exportFile, 2, {
      1: () => {
        throw new Error();
      },
    }),
  ).toThrow(ImportFileError);
});
it('TC-100 NFR-18 UT-15 five answers with maximal transcripts serialise below 100 KB', async () => {
  const questions = getBank().questions.slice(0, 5).map(toSnapshot);
  const session = SessionRecordSchema.parse({
    ...first.session,
    questions,
    setup: { ...first.session.setup, length: 5 },
  });
  const repo = createMemoryRepository();
  await repo.createSession(session);
  for (const [index, question] of questions.entries())
    await repo.putAnswer(
      AnswerRecordSchema.parse({
        ...first.answers[0],
        sessionId: session.id,
        index,
        questionId: question.id,
        rawTranscript: 'x'.repeat(ANSWER.MAX_CHARS),
        transcript: 'x'.repeat(ANSWER.MAX_CHARS),
      }),
    );
  expect(JSON.stringify((await repo.exportAll('0.1.0')).sessions[0]).length).toBeLessThanOrEqual(
    100_000,
  );
});
it('TC-099 UT-15 an aborted IndexedDB bundle leaves neither the session nor its answers', async () => {
  const db = await openDb(crypto.randomUUID());
  const repo = createIndexedDbRepository(db);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- The saved implementation is invoked with the active store via .call(this, ...) below.
  const original = FakeObjectStore.prototype.put;
  const write = vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(function (
    this: InstanceType<typeof FakeObjectStore>,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (this.name === 'answers') throw new DOMException('Full', 'QuotaExceededError');
    return original.call(this, value, key);
  });
  await expect(repo.importAll(file(exportFile))).rejects.toThrow();
  write.mockRestore();
  expect(await repo.getSession(first.session.id)).toBeNull();
  expect(await repo.getAnswers(first.session.id)).toEqual([]);
});
