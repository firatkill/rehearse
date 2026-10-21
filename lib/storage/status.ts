export type StorageStatus =
  'pending' | 'persistent' | 'not-saving' | 'blocked' | 'updated' | 'delete-blocked';
let status: StorageStatus = 'pending';
const listeners = new Set<() => void>();
export function storageStatus() {
  return status;
}
export function setStorageStatus(next: StorageStatus) {
  status = next;
  for (const listener of listeners) listener();
}
export function subscribeStorage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
