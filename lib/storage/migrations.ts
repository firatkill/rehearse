import { STORAGE } from '@/lib/config';
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
];
export const RECORD_MIGRATIONS: Readonly<Record<number, (r: unknown) => unknown>> = {};
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
