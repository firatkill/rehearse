import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { openDb, transactionDone } from '@/lib/storage/idb';
import { createIndexedDbRepository } from '@/lib/storage/idb-repository';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { record, answer } from '../fixtures/records';

afterEach(() => vi.unstubAllGlobals());
describe.each(['memory', 'indexeddb'] as const)('%s repository', (kind) => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  });
  const create = async (
    store?: { sessions: Map<string, unknown>; answers: Map<string, unknown> },
    clock?: () => Date,
  ) => {
    if (kind === 'memory') return createMemoryRepository(store, clock);
    const db = await openDb(crypto.randomUUID());
    if (store) {
      const tx = db.transaction(['sessions', 'answers'], 'readwrite');
      for (const value of store.sessions.values()) tx.objectStore('sessions').put(value);
      for (const value of store.answers.values()) tx.objectStore('answers').put(value);
      await transactionDone(tx);
    }
    return createIndexedDbRepository(db, clock);
  };
  it('TC-032 TC-092 UT-13 creates, reads, updates timestamps and lists newest first', async () => {
    const repo = await create(undefined, () => new Date('2026-10-21T13:00:00Z'));
    expect(repo.persistent).toBe(kind === 'indexeddb');
    expect(await repo.getSession(record.id)).toBeNull();
    await repo.createSession(record);
    expect(await repo.getSession(record.id)).toEqual(record);
    const updated = await repo.updateSession(record.id, {
      checkpoint: { ...record.checkpoint, phase: 'review' },
      updatedAt: '2000-01-01T00:00:00.000Z',
    });
    expect(updated.updatedAt).toBe('2026-10-21T13:00:00.000Z');
    expect(updated.checkpoint.phase).toBe('review');
    const newer = {
      ...record,
      id: 'c1557bb8-eaa6-4d58-8d4c-7128c3a1454c',
      createdAt: '2026-10-22T12:00:00.000Z',
    };
    await repo.createSession(newer);
    expect((await repo.listSessions()).sessions.map((s) => s.id)).toEqual([newer.id, record.id]);
  });
  it('TC-032 TC-092 UT-13 orders answers by index, replaces drafts and cascades deletion', async () => {
    const repo = await create();
    await repo.createSession(record);
    await repo.putAnswer({ ...answer, index: 2 });
    await repo.putAnswer(answer);
    await repo.putAnswer({ ...answer, transcript: 'Updated answer.' });
    const answers = await repo.getAnswers(record.id);
    expect(answers.map((a) => a.index)).toEqual([0, 2]);
    expect(answers[0]?.transcript).toBe('Updated answer.');
    const other = 'c1557bb8-eaa6-4d58-8d4c-7128c3a1454c';
    await repo.putAnswer({ ...answer, sessionId: other });
    await repo.deleteSession(record.id);
    expect(await repo.getSession(record.id)).toBeNull();
    expect(await repo.getAnswers(record.id)).toEqual([]);
    expect(await repo.getAnswers(other)).toHaveLength(1);
  });
  it('TC-032 TC-092 UT-13 skips invalid stored records and counts unreadable sessions', async () => {
    const store = {
      sessions: new Map<string, unknown>([
        ['invalid', { id: 'invalid' }],
        [record.id, record],
      ]),
      answers: new Map<string, unknown>([
        ['invalid', { sessionId: record.id, index: 1, transcript: 'bad' }],
        [`${record.id}:0`, answer],
      ]),
    };
    const repo = await create(store);
    expect(await repo.listSessions()).toEqual({ sessions: [record], skipped: 2 });
    expect(await repo.getSession('invalid')).toBeNull();
    expect(await repo.getAnswers(record.id)).toEqual([answer]);
  });
  it('TC-032 TC-092 UT-13 deleteAll removes sessions, answers and only Rehearse preferences', async () => {
    const preferences = new Map([
      ['rehearse-theme', 'dark'],
      ['rehearse-setup', '{}'],
      ['other-project', 'keep'],
    ]);
    vi.stubGlobal('localStorage', {
      get length() {
        return preferences.size;
      },
      key: (index: number) => [...preferences.keys()][index] ?? null,
      removeItem: (key: string) => preferences.delete(key),
    });
    const repo = await create();
    await repo.createSession(record);
    await repo.putAnswer(answer);
    await repo.deleteAll();
    expect(await repo.listSessions()).toEqual({ sessions: [], skipped: 0 });
    expect(await repo.getAnswers(record.id)).toEqual([]);
    expect([...preferences]).toEqual([['other-project', 'keep']]);
  });
  it('TC-044 FR-37 TRD 7.5 repository exchange strips tokens and skips existing sessions', async () => {
    const repo = await create();
    await repo.createSession(record);
    await repo.putAnswer(answer);
    const file = await repo.exportAll('0.1.0');
    expect(file.sessions[0]?.session.token).toBeNull();
    expect(file.sessions[0]?.session.tokenExpiresAt).toBeNull();
    expect(file.sessions[0]?.answers).toEqual([answer]);
    const imported = await create();
    const input = new File([JSON.stringify(file)], 'export.json');
    expect(await imported.importAll(input)).toEqual({ imported: 1, skipped: 0, invalid: 0 });
    expect(await imported.importAll(input)).toEqual({ imported: 0, skipped: 1, invalid: 0 });
    expect(await imported.getSession(record.id)).toMatchObject({
      origin: 'import',
      token: null,
      tokenExpiresAt: null,
      feedback: { enabled: false, reason: 'practice' },
    });
    expect(await imported.getAnswers(record.id)).toEqual([answer]);
    for (const invalid of [
      new File(['x'.repeat(5_000_001)], 'huge.json'),
      new File(['{'], 'invalid.json'),
      new File(['{}'], 'bad-shape.json'),
      new File([JSON.stringify({ ...file, formatVersion: 2 })], 'newer.json'),
    ])
      await expect(imported.importAll(invalid)).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
  });
});
