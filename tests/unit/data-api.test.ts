import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { record, answer } from '../fixtures/records';
import { createSqliteRepository, openSqlite } from '@/lib/storage/sqlite/repository';
import { resetEnvForTests } from '@/lib/env';
import { createHttpRepository } from '@/lib/storage/http-repository';
import { POST } from '@/app/api/data/route';
const directory = mkdtempSync(join(tmpdir(), 'rehearse-api-'));
const db = openSqlite(join(directory, 'api.sqlite'));
vi.mock('@/lib/storage/sqlite/repository', async (original) => ({
  ...(await original<typeof import('@/lib/storage/sqlite/repository')>()),
  getSqliteRepository: () => createSqliteRepository(db),
}));
afterEach(() => {
  resetEnvForTests();
});
function request(body: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}
it('TC-161 full HTTP repository validates, persists, imports and deletes', async () => {
  vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
    POST(
      new Request('http://localhost:3000/api/data', {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init.headers)),
          origin: 'http://localhost:3000',
        },
      }),
    ),
  );
  try {
    const repo = createHttpRepository();
    await repo.createSession(record);
    await repo.putAnswer(answer);
    expect(await repo.getSession(record.id)).toEqual(record);
    expect(await repo.getAnswers(record.id)).toEqual([answer]);
    expect((await repo.listSessions()).sessions).toHaveLength(1);
    expect(await repo.updateSession(record.id, { ...record, status: 'ended_early' })).toMatchObject(
      {
        status: 'ended_early',
      },
    );
    const exported = await repo.exportAll('test');
    await repo.deleteSession(record.id);
    expect(await repo.getSession(record.id)).toBeNull();
    expect(await repo.getAnswers(record.id)).toEqual([]);
    expect(await repo.importAll(new File([JSON.stringify(exported)], 'export.json'))).toEqual({
      imported: 1,
      skipped: 0,
      invalid: 0,
    });
    await repo.deleteAll();
    expect((await repo.listSessions()).sessions).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
});
it('TC-161 data boundary rejects malformed requests, origins and demo access', async () => {
  for (const input of [
    { operation: 'getSession', id: '../data' },
    { operation: 'createSession', session: {} },
    { operation: 'updateSession', id: record.id, patch: { schemaVersion: 1 } },
    { operation: 'other' },
  ])
    expect((await POST(request(input))).status).toBe(400);
  expect(
    (await POST(request({ operation: 'listSessions' }, 'https://untrusted.example'))).status,
  ).toBe(403);
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  expect((await POST(request({ operation: 'listSessions' }))).status).toBe(403);
});
it('TC-160 SQLite survives connection restart and retains migration version/WAL', async () => {
  const path = join(directory, 'restart.sqlite');
  const first = openSqlite(path);
  await createSqliteRepository(first).createSession(record);
  first.close();
  const second = openSqlite(path);
  try {
    expect(await createSqliteRepository(second).getSession(record.id)).toEqual(record);
    expect(second.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(second.pragma('user_version', { simple: true })).toBe(4);
  } finally {
    second.close();
  }
});
import { afterAll } from 'vitest';
afterAll(() => {
  db.close();
  rmSync(directory, { recursive: true });
});

it('TC-160 future SQLite migration versions fail closed', () => {
  const path = join(directory, 'future.sqlite');
  const future = openSqlite(path);
  future.pragma('user_version = 999');
  future.close();
  expect(() => openSqlite(path)).toThrow();
});

it('TC-160 TC-164 UT-14 migration 2 preserves version-1 SQLite sessions', async () => {
  const { default: Database } = await import('better-sqlite3');
  const { initialMigration } = await import('@/lib/storage/sqlite/migrations/001-sessions');
  const path = join(directory, 'upgrade.sqlite');
  const original = new Database(path);
  original.exec(initialMigration);
  original.pragma('user_version = 1');
  await createSqliteRepository(original).createSession(record);
  original.close();
  const upgraded = openSqlite(path);
  try {
    expect(await createSqliteRepository(upgraded).getSession(record.id)).toEqual(record);
    expect(upgraded.pragma('user_version', { simple: true })).toBe(4);
    expect(upgraded.prepare('SELECT * FROM cost_events').all()).toEqual([]);
  } finally {
    upgraded.close();
  }
});
