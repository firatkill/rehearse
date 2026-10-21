import { requestPersistence } from './persist';
import { AppError } from '@/lib/errors';
import { deleteDb, openDb, requestResult, transaction, transactionDone } from './idb';
import { migrateRecord } from './migrations';
import { SessionRecordSchema, AnswerRecordSchema, type SessionRecord } from './schema';
import type { SessionRepository } from './repository';
import { buildExport, readImport } from './export';

export function createIndexedDbRepository(
  initial: IDBDatabase,
  clock: () => Date = () => new Date(),
): SessionRepository {
  let connection: IDBDatabase | null = initial;
  const db = async () => {
    connection ??= await openDb(initial.name);
    return connection;
  };
  const all = async (store: string): Promise<unknown[]> => {
    const tx = transaction(await db(), store, 'readonly');
    return requestResult(tx.objectStore(store).getAll()) as Promise<unknown[]>;
  };
  const write = async (stores: string[], work: (tx: IDBTransaction) => void) => {
    const tx = transaction(await db(), stores, 'readwrite');
    const done = transactionDone(tx);
    try {
      work(tx);
    } catch (error) {
      tx.abort();
      await done.catch(() => {});
      throw error;
    }
    await done;
  };
  const parseSession = (value: unknown) => SessionRecordSchema.safeParse(migrateRecord(value));
  const repo: SessionRepository = {
    persistent: true,
    createSession: async (session) => {
      const value = SessionRecordSchema.parse(session);
      await write(['sessions'], (tx) => {
        tx.objectStore('sessions').put(value);
      });
    },
    getSession: async (id) => {
      const tx = transaction(await db(), 'sessions', 'readonly');
      const parsed = parseSession(await requestResult(tx.objectStore('sessions').get(id)));
      return parsed.success ? parsed.data : null;
    },
    updateSession: async (id, patch) => {
      const tx = transaction(await db(), 'sessions', 'readwrite');
      const done = transactionDone(tx);
      let updated: SessionRecord | undefined;
      const request = tx.objectStore('sessions').get(id);
      request.onsuccess = () => {
        const parsed = parseSession(request.result);
        if (!parsed.success) {
          tx.abort();
          return;
        }
        const next = SessionRecordSchema.safeParse({
          ...parsed.data,
          ...patch,
          id,
          schemaVersion: parsed.data.schemaVersion,
          updatedAt: clock().toISOString(),
        });
        if (!next.success) {
          tx.abort();
          return;
        }
        updated = next.data;
        tx.objectStore('sessions').put(updated);
      };
      await done;
      if (!updated) throw new AppError('INTERNAL_ERROR');
      if (updated.status === 'completed') await requestPersistence(await db());
      return updated;
    },
    listSessions: async () => {
      const sessions: SessionRecord[] = [];
      let skipped = 0;
      for (const value of await all('sessions')) {
        const parsed = parseSession(value);
        if (parsed.success) sessions.push(parsed.data);
        else skipped++;
      }
      for (const value of await all('answers'))
        if (!AnswerRecordSchema.safeParse(migrateRecord(value)).success) skipped++;
      return { sessions: sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), skipped };
    },
    deleteSession: async (id) => {
      await write(['sessions', 'answers'], (tx) => {
        tx.objectStore('sessions').delete(id);
        const cursor = tx
          .objectStore('answers')
          .index('by_sessionId')
          .openCursor(IDBKeyRange.only(id));
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (entry) {
            entry.delete();
            entry.continue();
          }
        };
      });
    },
    putAnswer: async (answer) => {
      const value = AnswerRecordSchema.parse(answer);
      await write(['answers'], (tx) => {
        tx.objectStore('answers').put(value);
      });
    },
    getAnswers: async (id) => {
      const tx = transaction(await db(), 'answers', 'readonly');
      const values: unknown[] = await requestResult(
        tx.objectStore('answers').index('by_sessionId').getAll(id),
      );
      return values
        .flatMap((value) => {
          const parsed = AnswerRecordSchema.safeParse(migrateRecord(value));
          return parsed.success ? [parsed.data] : [];
        })
        .sort((a, b) => a.index - b.index);
    },
    exportAll: (version) => buildExport(repo, version, clock),
    importAll: async (file) => {
      const { bundles, invalid } = await readImport(file);
      let imported = 0;
      let skipped = 0;
      for (const { session, answers } of bundles) {
        await write(['sessions', 'answers'], (tx) => {
          const store = tx.objectStore('sessions');
          const existing = store.get(session.id);
          existing.onsuccess = () => {
            if (existing.result !== undefined) {
              skipped++;
              return;
            }
            try {
              store.put(session);
              for (const answer of answers) tx.objectStore('answers').put(answer);
              imported++;
            } catch {
              tx.abort();
            }
          };
        });
      }
      return { imported, skipped, invalid };
    },
    deleteAll: async () => {
      const current = await db();
      await deleteDb(current);
      connection = null;
    },
  };
  return repo;
}
