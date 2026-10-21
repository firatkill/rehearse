import { STORAGE } from '@/lib/config';
import { MIGRATIONS, type Migration } from './migrations';
import { setStorageStatus } from './status';
export class StorageClosedError extends Error {}
export class StorageBlockedError extends Error {}
const connections = new Map<string, Promise<IDBDatabase>>();
const closed = new WeakSet<IDBDatabase>();
export function closeDb(db: IDBDatabase) {
  closed.add(db);
  db.close();
  connections.delete(db.name);
}
export function transaction(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode) {
  if (closed.has(db)) throw new StorageClosedError();
  return db.transaction(stores, mode);
}
export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Storage request failed'));
    };
  });
}
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('Storage transaction aborted'));
    };
    tx.onerror = () => {
      /* onabort reports the final transaction failure */
    };
  });
}
export function openDb(
  name: string = STORAGE.DB_NAME,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<IDBDatabase> {
  const version = Math.max(...migrations.map((migration) => migration.version));
  if (migrations === MIGRATIONS && version !== STORAGE.DB_VERSION)
    throw new Error('Storage migration version mismatch');
  if (!Number.isInteger(version) || version < 1) throw new Error('Invalid storage migrations');
  const existing = connections.get(name);
  if (existing) return existing;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    let settled = false;
    let blocked = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(blocked ? new StorageBlockedError() : new Error('Storage open timed out'));
    }, STORAGE.OPEN_TIMEOUT_MS);
    request.onblocked = () => {
      blocked = true;
    };
    request.onupgradeneeded = (event) => {
      const tx = request.transaction;
      if (!tx) return;
      for (const migration of [...migrations].sort((a, b) => a.version - b.version))
        if (event.oldVersion < migration.version && migration.version <= version)
          migration.upgrade(request.result, tx);
    };
    request.onerror = () => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(request.error ?? new Error('Storage request failed'));
      }
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      settled = true;
      db.onversionchange = () => {
        closeDb(db);
        setStorageStatus('updated');
      };
      resolve(db);
    };
  });
  connections.set(name, opening);
  return opening;
}
export function clearPreferences() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('rehearse-')) localStorage.removeItem(key);
    }
  } catch {
    /* Storage may be unavailable even when IndexedDB works. */
  }
}
export async function deleteDb(db: IDBDatabase) {
  closeDb(db);
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(db.name);
    request.onblocked = () => {
      setStorageStatus('delete-blocked');
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Storage request failed'));
    };
    request.onsuccess = () => {
      clearPreferences();
      setStorageStatus('pending');
      resolve();
    };
  });
}
