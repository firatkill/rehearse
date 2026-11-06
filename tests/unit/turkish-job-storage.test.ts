import { randomUUID } from 'node:crypto';
import { IDBFactory } from 'fake-indexeddb';
import { expect, it, vi, afterEach } from 'vitest';
import { STORAGE } from '@/lib/config';
import { openSqlite } from '@/lib/storage/sqlite/repository';
import { createJobRepository } from '@/lib/jobpost/repository';
import {
  migrateJobRecord,
  V2JobPostRecordSchema,
  LegacyJobPostRecordSchema,
} from '@/lib/storage/jobpost-schema';
import { migrateExport } from '@/lib/storage/export';
import { MIGRATIONS } from '@/lib/storage/migrations';
import { openDb, requestResult } from '@/lib/storage/idb';
import { jobRecord } from '../fixtures/job-record';
import { JobRequestSchema } from '@/lib/api/jobpost-contracts';
afterEach(() => vi.unstubAllGlobals());
const oldPost = () => V2JobPostRecordSchema.strip().parse({ ...jobRecord.post, schemaVersion: 2 });
it('TC-207 UT-14 job record/export migrations retain old English semantics and explicit Turkish', () => {
  expect(migrateJobRecord(oldPost())).toEqual(jobRecord.post);
  const v1 = LegacyJobPostRecordSchema.strip().parse({ ...jobRecord.post, schemaVersion: 1 });
  expect(migrateJobRecord({ ...v1, schemaVersion: 1 })).toEqual(jobRecord.post);
  expect(migrateJobRecord({ ...jobRecord.post, language: 'tr' })).toMatchObject({ language: 'tr' });
  expect(migrateJobRecord({ ...jobRecord.post, language: 'de' })).toBeNull();
  const envelope = {
    format: 'rehearse-export',
    formatVersion: 8,
    exportedAt: '2026-11-06T00:00:00.000Z',
    appVersion: '2.0.0',
    sessions: [],
    jobPosts: [oldPost()],
    generatedQuestions: [],
  };
  expect(migrateExport(envelope)).toMatchObject({
    formatVersion: STORAGE.EXPORT_FORMAT_VERSION,
    jobPosts: [jobRecord.post],
  });
  expect(
    JobRequestSchema.parse({ operation: 'create', text: 'İş ilanı', language: 'tr' }),
  ).toMatchObject({ language: 'tr' });
  expect(
    JobRequestSchema.safeParse({ operation: 'create', text: 'İş ilanı', language: 'de' }).success,
  ).toBe(false);
});
it('TC-207 UT-14 IndexedDB 8 upgrade appends the job language migration', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const name = randomUUID();
  const request = indexedDB.open(name, 8);
  request.onupgradeneeded = () => {
    for (const m of MIGRATIONS.filter((m) => m.version <= 8))
      m.upgrade(request.result, request.transaction!);
  };
  const previous = await requestResult(request);
  await requestResult(
    previous.transaction('jobPosts', 'readwrite').objectStore('jobPosts').put(oldPost()),
  );
  previous.close();
  const current = await openDb(name);
  try {
    expect(
      await requestResult(
        current.transaction('jobPosts').objectStore('jobPosts').get(jobRecord.post.id),
      ),
    ).toEqual(jobRecord.post);
  } finally {
    current.close();
  }
});
it('TC-207 SQLite keeps explicit language across revisions and defaults older callers to English', () => {
  const db = openSqlite(':memory:');
  try {
    const repo = createJobRepository(db);
    expect(repo.create('English post').language).toBe('en');
    const post = repo.create('Türkçe ilan', null, 'tr');
    expect(repo.get(post.id)?.language).toBe('tr');
    expect(repo.updateText(post.id, 'Düzeltilmiş Türkçe ilan').language).toBe('tr');
  } finally {
    db.close();
  }
});
