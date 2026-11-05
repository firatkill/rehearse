import { STORAGE } from '@/lib/config';
import {
  LegacyAnswerRecordSchema,
  LegacySessionRecordSchema,
  V3AnswerRecordSchema as AnswerRecordSchema,
  V4AnswerRecordSchema as CurrentAnswerRecordSchema,
  AnswerRecordSchema as LatestAnswerRecordSchema,
  V3SessionRecordSchema as SessionRecordSchema,
  V4SessionRecordSchema as CurrentSessionRecordSchema,
  SessionRecordSchema as LatestSessionRecordSchema,
} from './schema';
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
  {
    version: 3,
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
  {
    version: 4,
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
  {
    version: 5,
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
  2: (input) => {
    if (typeof input !== 'object' || input === null) return null;
    const value = { ...input, schemaVersion: 3 };
    const session = SessionRecordSchema.safeParse(value);
    if (session.success) return session.data;
    return AnswerRecordSchema.parse(value);
  },
  3: (input) => {
    const session = SessionRecordSchema.safeParse(input);
    if (session.success)
      return CurrentSessionRecordSchema.parse({ ...session.data, schemaVersion: 4 });
    const answer = AnswerRecordSchema.parse(input);
    return CurrentAnswerRecordSchema.parse({
      ...answer,
      schemaVersion: 4,
      followUp: null,
      followUpRecords: [],
    });
  },
  4: (input) => {
    const session = CurrentSessionRecordSchema.safeParse(input);
    if (session.success)
      return LatestSessionRecordSchema.parse({
        ...session.data,
        schemaVersion: 5,
        setup: { ...session.data.setup, dimension: null },
      });
    return LatestAnswerRecordSchema.parse({
      ...CurrentAnswerRecordSchema.parse(input),
      schemaVersion: 5,
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
