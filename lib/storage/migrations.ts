import { STORAGE } from '@/lib/config';
import { LegacyAnswerRecordSchema, LegacySessionRecordSchema } from './schema';
import { completeAttempt } from './attempts';
export type Migration = {
  version: number;
  upgrade: (db: IDBDatabase, tx: IDBTransaction) => void;
};
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    upgrade(db) {
      const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
      sessions.createIndex('by_createdAt', 'createdAt');
      sessions.createIndex('by_status', 'status');
      const answers = db.createObjectStore('answers', { keyPath: ['sessionId', 'index'] });
      answers.createIndex('by_sessionId', 'sessionId');
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  },
  {
    version: 2,
    upgrade(_db, tx) {
      for (const name of ['sessions', 'answers']) {
        const request = tx.objectStore(name).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const migrated = migrateRecord(cursor.value);
          if (migrated !== null) cursor.update(migrated);
          cursor.continue();
        };
      }
    },
  },
];
export const RECORD_MIGRATIONS: Readonly<Record<number, (r: unknown) => unknown>> = {
  1: (input) => {
    const session = LegacySessionRecordSchema.safeParse(input);
    if (session.success) return { ...session.data, schemaVersion: 2 };
    const answer = LegacyAnswerRecordSchema.parse(input);
    return completeAttempt({
      ...answer,
      schemaVersion: 2,
      attemptRecords: [],
      bestAttemptId: null,
    });
  },
};
export function migrateRecord(
  input: unknown,
  migrations = RECORD_MIGRATIONS,
  target: number = STORAGE.RECORD_SCHEMA_VERSION,
): unknown {
  let record = input;
  const version = (value: unknown): number | null =>
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    typeof value.schemaVersion === 'number'
      ? value.schemaVersion
      : null;
  let current = version(record);
  while (current !== null && current < target) {
    const migrate = migrations[current];
    if (!migrate) return null;
    try {
      record = migrate(record);
    } catch {
      return null;
    }
    const next = version(record);
    if (next === null || next <= current) return null;
    current = next;
  }
  return current === target ? record : null;
}
