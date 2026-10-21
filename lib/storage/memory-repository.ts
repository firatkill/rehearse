import { clearPreferences, deleteDatabase } from './idb';
import { storageStatus, setStorageStatus } from './status';
import { migrateRecord } from './migrations';
import { buildExport, readImport } from './export';
import { AppError } from '@/lib/errors';
import { SessionRecordSchema, AnswerRecordSchema, type SessionRecord } from './schema';
import type { SessionRepository } from './repository';

type MemoryStore = { sessions: Map<string, unknown>; answers: Map<string, unknown> };
export function createMemoryRepository(
  store: MemoryStore = { sessions: new Map(), answers: new Map() },
  clock: () => Date = () => new Date(),
): SessionRepository {
  const perform = <T>(work: () => T): Promise<T> => Promise.resolve().then(work);
  const readSession = (id: string): SessionRecord | null => {
    const parsed = SessionRecordSchema.safeParse(migrateRecord(store.sessions.get(id)));
    return parsed.success ? parsed.data : null;
  };
  const repository: SessionRepository = {
    persistent: false,
    createSession: (session) =>
      perform(() => {
        store.sessions.set(session.id, SessionRecordSchema.parse(session));
      }),
    getSession: (id) => perform(() => readSession(id)),
    updateSession: (id, patch) =>
      perform(() => {
        const existing = readSession(id);
        if (!existing) throw new AppError('INTERNAL_ERROR');
        const updated = SessionRecordSchema.parse({
          ...existing,
          ...patch,
          id,
          schemaVersion: existing.schemaVersion,
          updatedAt: clock().toISOString(),
        });
        store.sessions.set(id, updated);
        return SessionRecordSchema.parse(updated);
      }),
    listSessions: () =>
      perform(() => {
        const sessions: SessionRecord[] = [];
        let skipped = 0;
        for (const value of store.sessions.values()) {
          const parsed = SessionRecordSchema.safeParse(migrateRecord(value));
          if (parsed.success) sessions.push(parsed.data);
          else skipped++;
        }
        for (const value of store.answers.values())
          if (!AnswerRecordSchema.safeParse(migrateRecord(value)).success) skipped++;
        sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { sessions, skipped };
      }),
    deleteSession: (id) =>
      perform(() => {
        store.sessions.delete(id);
        for (const key of store.answers.keys())
          if (key.startsWith(`${id}:`)) store.answers.delete(key);
      }),
    putAnswer: (answer) =>
      perform(() => {
        store.answers.set(`${answer.sessionId}:${answer.index}`, AnswerRecordSchema.parse(answer));
      }),
    getAnswers: (id) =>
      perform(() =>
        [...store.answers.values()]
          .flatMap((value) => {
            const parsed = AnswerRecordSchema.safeParse(migrateRecord(value));
            return parsed.success && parsed.data.sessionId === id ? [parsed.data] : [];
          })
          .sort((a, b) => a.index - b.index),
      ),
    exportAll: (appVersion) => buildExport(repository, appVersion, clock),
    importAll: async (file) => {
      const { bundles, invalid } = await readImport(file);
      let imported = 0;
      let skipped = 0;
      for (const { session, answers } of bundles) {
        if (store.sessions.has(session.id)) {
          skipped++;
          continue;
        }
        store.sessions.set(session.id, session);
        for (const answer of answers)
          store.answers.set(`${answer.sessionId}:${answer.index}`, answer);
        imported++;
      }
      return { imported, skipped, invalid };
    },
    deleteAll: async () => {
      const previous = storageStatus();
      if (typeof indexedDB !== 'undefined') await deleteDatabase();
      else clearPreferences();
      store.sessions.clear();
      store.answers.clear();
      setStorageStatus(previous === 'updated' ? 'updated' : 'not-saving');
    },
  };
  return repository;
}
