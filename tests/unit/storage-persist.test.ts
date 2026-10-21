import { version } from '@/package.json';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, expect, it, vi } from 'vitest';
import { openDb, closeDb, requestResult } from '@/lib/storage/idb';
import { createIndexedDbRepository } from '@/lib/storage/idb-repository';
import { record } from '../fixtures/records';
afterEach(() => vi.unstubAllGlobals());
it('TC-096 FR-35 requests persistence once after completion and remembers across connections', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  const persist = vi.fn().mockRejectedValue(new Error('Denied'));
  vi.stubGlobal('navigator', { storage: { persist } });
  const name = crypto.randomUUID();
  const db = await openDb(name);
  const repo = createIndexedDbRepository(db);
  await repo.createSession(record);
  expect(persist).not.toHaveBeenCalled();
  await repo.updateSession(record.id, { status: 'completed' });
  await repo.updateSession(record.id, { status: 'completed' });
  expect(persist).toHaveBeenCalledOnce();
  expect(
    await requestResult(
      db.transaction('meta', 'readonly').objectStore('meta').get('persistRequested'),
    ),
  ).toEqual({ key: 'persistRequested', value: true });
  expect(
    await requestResult(
      db.transaction('meta', 'readonly').objectStore('meta').get('createdWithAppVersion'),
    ),
  ).toMatchObject({ key: 'createdWithAppVersion', value: version });
  closeDb(db);
  const reopened = await openDb(name);
  await createIndexedDbRepository(reopened).updateSession(record.id, { status: 'completed' });
  expect(persist).toHaveBeenCalledOnce();
  closeDb(reopened);
});
it('TC-096 FR-35 unavailable persistence API does not block completion', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('navigator', {});
  const db = await openDb(crypto.randomUUID());
  const repo = createIndexedDbRepository(db);
  await repo.createSession(record);
  await repo.updateSession(record.id, { status: 'completed' });
  expect((await repo.getSession(record.id))?.status).toBe('completed');
  closeDb(db);
});
