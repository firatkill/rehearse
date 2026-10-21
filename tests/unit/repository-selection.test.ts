import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { record, answer } from '../fixtures/records';
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('TC-094 FR-39 absent storage keeps a single memory repository for the tab', async () => {
  vi.stubGlobal('indexedDB', undefined);
  const { getRepository, useRepository } = await import('@/hooks/use-repository');
  const first = await getRepository();
  expect(first.persistent).toBe(false);
  vi.stubGlobal('indexedDB', new IDBFactory());
  expect(await getRepository()).toBe(first);
  const facade = useRepository();
  await facade.createSession(record);
  await facade.putAnswer(answer);
  expect(await facade.getSession(record.id)).toEqual(record);
  expect(await facade.getAnswers(record.id)).toEqual([answer]);
  expect((await facade.listSessions()).sessions).toHaveLength(1);
  await facade.updateSession(record.id, { status: 'ended_early' });
  const file = await facade.exportAll('0.1.0');
  await facade.deleteSession(record.id);
  expect(await facade.importAll(new File([JSON.stringify(file)], 'export.json'))).toMatchObject({
    imported: 1,
  });
  await facade.deleteAll();
  expect((await facade.listSessions()).sessions).toEqual([]);
});
it('TC-094 FR-34 selected IndexedDB facade is persistent, with observable status', async () => {
  const { getRepository, useRepository, switchToMemoryRepository } =
    await import('@/hooks/use-repository');
  const { subscribeStorage, storageStatus } = await import('@/lib/storage/status');
  const { StorageClosedError } = await import('@/lib/storage/idb');
  const changed = vi.fn();
  const unsubscribe = subscribeStorage(changed);
  expect((await getRepository()).persistent).toBe(true);
  expect(useRepository().persistent).toBe(true);
  expect(storageStatus()).toBe('persistent');
  expect(changed).toHaveBeenCalled();
  await switchToMemoryRepository(record, [answer], new StorageClosedError());
  expect(storageStatus()).toBe('updated');
  expect(useRepository().persistent).toBe(false);
  expect(await useRepository().getAnswers(record.id)).toEqual([answer]);
  unsubscribe();
});
it('TC-094 FR-39 failed opening and failed writes select the not-saving fallback', async () => {
  vi.spyOn(indexedDB, 'open').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError');
  });
  const { getRepository, switchToMemoryRepository } = await import('@/hooks/use-repository');
  const { storageStatus } = await import('@/lib/storage/status');
  expect((await getRepository()).persistent).toBe(false);
  expect(storageStatus()).toBe('not-saving');
  await switchToMemoryRepository(record, [answer], new Error('quota'));
  expect(storageStatus()).toBe('not-saving');
});
it('TC-094 FR-39 blocked startup has only the blocked status and keeps memory fallback', async () => {
  const idb = await import('@/lib/storage/idb');
  vi.spyOn(idb, 'openDb').mockRejectedValue(new idb.StorageBlockedError());
  const { getRepository } = await import('@/hooks/use-repository');
  const { storageStatus } = await import('@/lib/storage/status');
  expect((await getRepository()).persistent).toBe(false);
  expect(storageStatus()).toBe('blocked');
});
