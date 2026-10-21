import { z } from 'zod';
import { transaction, transactionDone } from './idb';
const PersistMetaSchema = z
  .object({ key: z.literal('persistRequested'), value: z.boolean() })
  .strict();
export async function requestPersistence(db: IDBDatabase): Promise<void> {
  const tx = transaction(db, 'meta', 'readwrite');
  const done = transactionDone(tx);
  const state = { shouldRequest: false };
  const store = tx.objectStore('meta');
  const request = store.get('persistRequested');
  request.onsuccess = () => {
    const parsed = PersistMetaSchema.safeParse(request.result);
    if (parsed.success && parsed.data.value) return;
    store.put({ key: 'persistRequested', value: true });
    state.shouldRequest = true;
  };
  await done;
  if (state.shouldRequest) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Older browsers may omit StorageManager or persist despite current DOM typings.
      await navigator.storage?.persist?.();
    } catch {
      /* Permission is optional. */
    }
  }
}
