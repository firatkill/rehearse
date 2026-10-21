import { HTTP, STORAGE } from '@/lib/config';
import { AppError } from '@/lib/errors';
import {
  SessionRecordSchema,
  AnswerRecordSchema,
  ExportFileSchema,
  type SessionRecord,
} from './schema';
import type { SessionRepository } from './repository';

type MemoryStore = { sessions: Map<string, unknown>; answers: Map<string, unknown> };
export function createMemoryRepository(
  store: MemoryStore = { sessions: new Map(), answers: new Map() },
  clock: () => Date = () => new Date(),
): SessionRepository {
  const perform = <T>(work: () => T): Promise<T> => Promise.resolve().then(work);
  const readSession = (id: string): SessionRecord | null => {
    const parsed = SessionRecordSchema.safeParse(store.sessions.get(id));
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
          const parsed = SessionRecordSchema.safeParse(value);
          if (parsed.success) sessions.push(parsed.data);
          else skipped++;
        }
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
            const parsed = AnswerRecordSchema.safeParse(value);
            return parsed.success && parsed.data.sessionId === id ? [parsed.data] : [];
          })
          .sort((a, b) => a.index - b.index),
      ),
    exportAll: async (appVersion) => {
      const { sessions } = await repository.listSessions();
      return ExportFileSchema.parse({
        format: 'rehearse-export',
        formatVersion: STORAGE.EXPORT_FORMAT_VERSION,
        exportedAt: clock().toISOString(),
        appVersion,
        sessions: await Promise.all(
          sessions.map(async (session) => ({
            session: { ...session, token: null, tokenExpiresAt: null },
            answers: await repository.getAnswers(session.id),
          })),
        ),
      });
    },
    importAll: async (file) => {
      if (file.size > HTTP.IMPORT_MAX_BYTES) throw new AppError('VALIDATION_FAILED');
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text()) as unknown;
      } catch {
        throw new AppError('VALIDATION_FAILED');
      }
      const parsed = ExportFileSchema.safeParse(raw);
      if (!parsed.success || parsed.data.formatVersion !== STORAGE.EXPORT_FORMAT_VERSION)
        throw new AppError('VALIDATION_FAILED');
      let imported = 0;
      let skipped = 0;
      for (const { session, answers } of parsed.data.sessions) {
        if (store.sessions.has(session.id)) {
          skipped++;
          continue;
        }
        const importedSession = SessionRecordSchema.parse({
          ...session,
          origin: 'import',
          token: null,
          tokenExpiresAt: null,
          ...(session.status === 'in_progress'
            ? { feedback: { enabled: false, reason: 'practice' } }
            : {}),
        });
        store.sessions.set(session.id, importedSession);
        for (const answer of answers)
          store.answers.set(`${answer.sessionId}:${answer.index}`, answer);
        imported++;
      }
      return { imported, skipped, invalid: 0 };
    },
    deleteAll: () =>
      perform(() => {
        store.sessions.clear();
        store.answers.clear();
        if (typeof localStorage !== 'undefined') {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith('rehearse-')) localStorage.removeItem(key);
          }
        }
      }),
  };
  return repository;
}
