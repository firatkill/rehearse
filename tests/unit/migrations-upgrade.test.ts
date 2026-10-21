import { IDBFactory } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import { openDb, closeDb, requestResult, transactionDone } from '@/lib/storage/idb';
import { MIGRATIONS, migrateRecord } from '@/lib/storage/migrations';
import { SessionRecordSchema } from '@/lib/storage/schema';
import { record } from '../fixtures/records';
it('TC-093 UT-14 upgrade preserves data, adds index and migrates on read without rewriting', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = crypto.randomUUID();
  const first = await openDb(name, MIGRATIONS);
  const tx = first.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').put({ ...record, schemaVersion: 0 });
  await transactionDone(tx);
  closeDb(first);
  const upgraded = await openDb(name, [
    ...MIGRATIONS,
    {
      version: 2,
      upgrade(_db, upgradeTx) {
        upgradeTx.objectStore('sessions').createIndex('by_role', 'setup.role');
      },
    },
  ]);
  const store = upgraded.transaction('sessions', 'readonly').objectStore('sessions');
  expect(store.index('by_role').keyPath).toBe('setup.role');
  const raw: unknown = await requestResult(store.get(record.id));
  const migrated = migrateRecord(raw, {
    0: (value) => ({ ...(value as object), schemaVersion: 1 }),
  });
  expect(SessionRecordSchema.parse(migrated)).toEqual(record);
  expect(
    await requestResult(
      upgraded.transaction('sessions', 'readonly').objectStore('sessions').get(record.id),
    ),
  ).toMatchObject({ schemaVersion: 0 });
  expect(migrateRecord(raw)).toBeNull();
  expect(
    migrateRecord(raw, {
      0: () => {
        throw new Error();
      },
    }),
  ).toBeNull();
  expect(migrateRecord(raw, { 0: (value) => value })).toBeNull();
  expect(migrateRecord({ ...record, schemaVersion: 2 })).toBeNull();
  expect(migrateRecord(null)).toBeNull();
  closeDb(upgraded);
  vi.unstubAllGlobals();
});
