import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  openDb,
  closeDb,
  transaction,
  requestResult,
  StorageBlockedError,
  StorageClosedError,
} from '@/lib/storage/idb';
import { MIGRATIONS } from '@/lib/storage/migrations';
import { STORAGE } from '@/lib/config';
import { storageStatus } from '@/lib/storage/status';
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('TC-091 UT-12 creates normative stores and indexes and caches one connection', async () => {
  const name = crypto.randomUUID();
  const db = await openDb(name);
  expect(await openDb(name)).toBe(db);
  expect([...db.objectStoreNames]).toEqual(['answers', 'meta', 'sessions']);
  const tx = transaction(db, ['sessions', 'answers'], 'readonly');
  expect(tx.objectStore('sessions').keyPath).toBe('id');
  expect([...tx.objectStore('sessions').indexNames]).toEqual(['by_createdAt', 'by_status']);
  expect(tx.objectStore('answers').keyPath).toEqual(['sessionId', 'index']);
  expect(tx.objectStore('answers').index('by_sessionId').keyPath).toBe('sessionId');
  closeDb(db);
});
it('TC-091 UT-12 versionchange closes and rejects later writes', async () => {
  const name = crypto.randomUUID();
  const db = await openDb(name);
  const newer = await requestResult(indexedDB.open(name, 2));
  expect(storageStatus()).toBe('updated');
  expect(() => transaction(db, 'sessions', 'readwrite')).toThrow(StorageClosedError);
  newer.close();
});
it('TC-091 UT-12 blocked timeout rejects and closes a late success connection', async () => {
  const name = crypto.randomUUID();
  const old = await requestResult(indexedDB.open(name, 1));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const opening = openDb(name, [...MIGRATIONS, { version: 2, upgrade() {} }]);
  const rejection = expect(opening).rejects.toBeInstanceOf(StorageBlockedError);
  // Let fake-indexeddb deliver blocked before advancing only the timeout clock.
  await new Promise<void>((resolve) => {
    old.onversionchange = () => {
      resolve();
    };
  });
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  await vi.advanceTimersByTimeAsync(STORAGE.OPEN_TIMEOUT_MS);
  await rejection;
  old.close();
  const third = await requestResult(indexedDB.open(name, 3));
  third.close();
});
it('TC-091 UT-12 guards configuration/migration mismatch', () => {
  const original = STORAGE.DB_VERSION;
  Object.defineProperty(STORAGE, 'DB_VERSION', { value: original + 1, configurable: true });
  try {
    expect(() => openDb(crypto.randomUUID())).toThrow('migration version mismatch');
  } finally {
    Object.defineProperty(STORAGE, 'DB_VERSION', { value: original, configurable: true });
  }
  expect(() => openDb(crypto.randomUUID(), [])).toThrow('Invalid storage migrations');
});
it('TC-091 UT-12 opening errors reject and requests that never settle time out', async () => {
  const name = crypto.randomUUID();
  const newer = await requestResult(indexedDB.open(name, 2));
  newer.close();
  await expect(openDb(name)).rejects.toMatchObject({ name: 'VersionError' });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const stalled = new EventTarget() as IDBOpenDBRequest;
  vi.spyOn(indexedDB, 'open').mockReturnValue(stalled);
  const opening = openDb(crypto.randomUUID());
  const rejected = expect(opening).rejects.toThrow('Storage open timed out');
  await vi.advanceTimersByTimeAsync(STORAGE.OPEN_TIMEOUT_MS);
  await rejected;
});
