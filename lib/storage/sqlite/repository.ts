import 'server-only';
import { jobAnalysisMigration } from './migrations/007-job-analysis';
import { jobLanguageMigration } from './migrations/006-job-language';
import { sessionLanguageMigration } from './migrations/005-session-language';
import { interviewDateMigration } from './migrations/004-interview-date';
import { jobPostsMigration } from './migrations/003-job-posts';
import { readJobData, importJobData } from './job-data';
import { costsMigration } from './migrations/002-costs';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { migrateRecord } from '../migrations';
import { SessionRecordSchema, AnswerRecordSchema } from '../schema';
import { buildExport, readImport } from '../export';
import type { SessionRepository } from '../repository';
import { initialMigration } from './migrations/001-sessions';

const migrations = [
  initialMigration,
  costsMigration,
  jobPostsMigration,
  interviewDateMigration,
  sessionLanguageMigration,
  jobLanguageMigration,
  jobAnalysisMigration,
];
const rowSchema = z.object({ value: z.string() });
function value(row: unknown): unknown {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) return undefined;
  try {
    return migrateRecord(JSON.parse(parsed.data.value) as unknown);
  } catch {
    return undefined;
  }
}
export function openSqlite(path: string) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  const version = z
    .number()
    .int()
    .nonnegative()
    .parse(db.pragma('user_version', { simple: true }));
  if (version > migrations.length) {
    db.close();
    throw new AppError('INTERNAL_ERROR');
  }
  db.transaction(() => {
    for (const [index, sql] of migrations.entries()) {
      if (index < version) continue;
      db.exec(sql);
      db.pragma(`user_version = ${index + 1}`);
    }
  })();
  return db;
}
export function createSqliteRepository(
  db: Database.Database,
  clock: () => Date = () => new Date(),
): SessionRepository {
  const perform = <T>(work: () => T): Promise<T> => Promise.resolve().then(work);
  const read = (id: string) => {
    const parsed = SessionRecordSchema.safeParse(
      value(db.prepare('SELECT value FROM sessions WHERE id = ?').get(id)),
    );
    return parsed.success ? parsed.data : null;
  };
  const putSession = db.prepare('INSERT OR REPLACE INTO sessions (id, value) VALUES (?, ?)');
  const putAnswer = db.prepare(
    'INSERT OR REPLACE INTO answers (session_id, slot, value) VALUES (?, ?, ?)',
  );
  const repo: SessionRepository = {
    persistent: true,
    createSession: (session) =>
      perform(() => {
        const parsed = SessionRecordSchema.parse(session);
        putSession.run(parsed.id, JSON.stringify(parsed));
      }),
    getSession: (id) => perform(() => read(id)),
    updateSession: (id, patch) =>
      perform(() =>
        db.transaction(() => {
          const existing = read(id);
          if (!existing) throw new AppError('INTERNAL_ERROR');
          const updated = SessionRecordSchema.parse({
            ...existing,
            ...patch,
            id,
            schemaVersion: existing.schemaVersion,
            updatedAt: clock().toISOString(),
          });
          putSession.run(id, JSON.stringify(updated));
          return updated;
        })(),
      ),
    listSessions: () =>
      perform(() => {
        let skipped = 0;
        const sessions = db
          .prepare('SELECT value FROM sessions')
          .all()
          .flatMap((row) => {
            const parsed = SessionRecordSchema.safeParse(value(row));
            if (parsed.success) return [parsed.data];
            skipped++;
            return [];
          });
        for (const row of db.prepare('SELECT value FROM answers').all())
          if (!AnswerRecordSchema.safeParse(value(row)).success) skipped++;
        return {
          sessions: sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          skipped,
        };
      }),
    deleteSession: (id) =>
      perform(() => {
        db.transaction(() => {
          db.prepare('DELETE FROM answers WHERE session_id = ?').run(id);
          db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
        })();
      }),
    putAnswer: (answer) =>
      perform(() => {
        const parsed = AnswerRecordSchema.parse(answer);
        putAnswer.run(parsed.sessionId, parsed.index, JSON.stringify(parsed));
      }),
    getAnswers: (id) =>
      perform(() =>
        db
          .prepare('SELECT value FROM answers WHERE session_id = ? ORDER BY slot')
          .all(id)
          .flatMap((row) => {
            const parsed = AnswerRecordSchema.safeParse(value(row));
            return parsed.success && parsed.data.sessionId === id ? [parsed.data] : [];
          }),
      ),
    exportAll: (version) => buildExport(repo, version, clock, readJobData(db)),
    importAll: async (file) => {
      const { bundles, invalid, jobData } = await readImport(file);
      return db.transaction(() => {
        importJobData(db, jobData);
        let imported = 0;
        let skipped = 0;
        for (const { session, answers } of bundles) {
          if (db.prepare('SELECT id FROM sessions WHERE id = ?').get(session.id)) {
            skipped++;
            continue;
          }
          putSession.run(session.id, JSON.stringify(session));
          for (const answer of answers)
            putAnswer.run(answer.sessionId, answer.index, JSON.stringify(answer));
          imported++;
        }
        return { imported, skipped, invalid };
      })();
    },
    deleteAll: () =>
      perform(() => {
        db.transaction(() => {
          db.exec(
            'DELETE FROM generated_questions; DELETE FROM job_posts; DELETE FROM answers; DELETE FROM sessions;',
          );
        })();
      }),
  };
  return repo;
}
let repository: SessionRepository | undefined;
let connection: Database.Database | undefined;
export function getSqliteConnection(): Database.Database {
  if (getEnv().APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
  if (!connection) {
    const directory = getEnv().DATA_DIR;
    mkdirSync(directory, { recursive: true });
    connection = openSqlite(join(directory, 'rehearse.sqlite'));
  }
  return connection;
}
export function getSqliteRepository(): SessionRepository {
  if (getEnv().APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
  repository ??= createSqliteRepository(getSqliteConnection());
  return repository;
}
