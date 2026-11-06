import { STORAGE } from '@/lib/config';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import { openSqlite, createSqliteRepository } from '@/lib/storage/sqlite/repository';
import { initialMigration } from '@/lib/storage/sqlite/migrations/001-sessions';
import { costsMigration } from '@/lib/storage/sqlite/migrations/002-costs';
import { jobPostsMigration } from '@/lib/storage/sqlite/migrations/003-job-posts';
import { createJobRepository } from '@/lib/jobpost/repository';
import { completeAttempt } from '@/lib/storage/attempts';
import { answeredQuestionIds, upcomingPosts } from '@/lib/jobpost/upcoming';
import { readImport } from '@/lib/storage/export';
import {
  JobPostRecordSchema,
  LegacyJobPostRecordSchema,
  migrateJobRecord,
} from '@/lib/storage/jobpost-schema';
import { openDb, closeDb, requestResult, transactionDone } from '@/lib/storage/idb';
import { MIGRATIONS } from '@/lib/storage/migrations';
import { JobGenerationSchema } from '@/lib/jobpost/schema';
import { mockJobpostOutput } from '@/lib/jobpost/mock';
import { jobpostUserMessage } from '@/lib/prompts/jobpost';
import { jobRecord } from '../fixtures/job-record';
import { jobText } from '../fixtures/jobpost';
import { record, answer } from '../fixtures/records';
const legacy = LegacyJobPostRecordSchema.strip().parse({ ...jobRecord.post, schemaVersion: 1 });
it('TC-182 UT-14 SQLite migration 4 and export 6→7 retain old posts with no date', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'rehearse-date-'));
  const path = join(directory, 'data.sqlite');
  const old = new Database(path);
  old.exec(initialMigration + costsMigration + jobPostsMigration);
  old.pragma('user_version = 3');
  old
    .prepare('INSERT INTO job_posts(id,value) VALUES (?,?)')
    .run(legacy.id, JSON.stringify(legacy));
  old.close();
  const db = openSqlite(path);
  try {
    expect(db.pragma('user_version', { simple: true })).toBe(6);
    expect(createJobRepository(db).get(legacy.id)).toEqual(jobRecord.post);
    const imported = await readImport(
      new File(
        [
          JSON.stringify({
            format: 'rehearse-export',
            formatVersion: 6,
            exportedAt: record.createdAt,
            appVersion: 'old',
            sessions: [],
            jobPosts: [legacy],
            generatedQuestions: [],
          }),
        ],
        'old.json',
      ),
    );
    expect(imported.jobData.jobPosts).toEqual([jobRecord.post]);
    expect(migrateJobRecord({ ...legacy, schemaVersion: 99 })).toBeNull();
    expect(
      JobPostRecordSchema.safeParse({ ...jobRecord.post, interviewDate: '2026-02-30' }).success,
    ).toBe(false);
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});
it('TC-182 UT-14 IndexedDB migration 7 retains version-1 job records', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  const name = randomUUID();
  const request = indexedDB.open(name, 6);
  request.onupgradeneeded = () => {
    for (const migration of MIGRATIONS.filter((m) => m.version <= 6))
      migration.upgrade(request.result, request.transaction!);
  };
  const old = await requestResult(request);
  const tx = old.transaction('jobPosts', 'readwrite');
  tx.objectStore('jobPosts').put(legacy);
  await transactionDone(tx);
  old.close();
  const db = await openDb(name);
  try {
    expect(db.version).toBe(STORAGE.DB_VERSION);
    expect(
      await requestResult(db.transaction('jobPosts').objectStore('jobPosts').get(legacy.id)),
    ).toEqual(jobRecord.post);
  } finally {
    closeDb(db);
    vi.unstubAllGlobals();
  }
});
it('TC-182 dates persist/clear/export; revisions transfer the date without changing old questions', async () => {
  const db = openSqlite(':memory:');
  try {
    const jobs = createJobRepository(db);
    const post = jobs.create(jobText);
    jobs.setInterviewDate(post.id, '2026-11-11');
    const output = JobGenerationSchema.parse(mockJobpostOutput(jobpostUserMessage(jobText, 8)));
    jobs.commitGeneration(post.id, output, output.questions, 'mock');
    const oldQuestions = jobs.questions(post.id);
    const revision = jobs.updateText(post.id, jobText + ' More context.');
    expect(revision.interviewDate).toBe('2026-11-11');
    expect(jobs.get(post.id)?.interviewDate).toBeNull();
    expect(jobs.questions(post.id)).toEqual(oldQuestions);
    const exported = await createSqliteRepository(db).exportAll('test');
    expect(exported.formatVersion).toBe(STORAGE.EXPORT_FORMAT_VERSION);
    const imported = await readImport(new File([JSON.stringify(exported)], 'date.json'));
    expect(imported.jobData.jobPosts.find((p) => p.id === revision.id)?.interviewDate).toBe(
      '2026-11-11',
    );
    expect(jobs.setInterviewDate(revision.id, null).interviewDate).toBeNull();
    expect(() => jobs.setInterviewDate(revision.id, 'not-a-date')).toThrow();
  } finally {
    db.close();
  }
});
it('TC-182 coming-up counts distinct submitted questions across sessions, excluding drafts and skips', async () => {
  const db = openSqlite(':memory:');
  try {
    const jobs = createJobRepository(db);
    const sessions = createSqliteRepository(db);
    const post = jobs.create(jobText);
    jobs.setInterviewDate(post.id, '2026-11-11');
    const output = JobGenerationSchema.parse(mockJobpostOutput(jobpostUserMessage(jobText, 8)));
    jobs.commitGeneration(post.id, output, output.questions, 'mock');
    const questions = jobs.questions(post.id);
    for (let i = 0; i < 2; i++) {
      const session = {
        ...record,
        id: randomUUID(),
        questions: record.questions.map((q, index) => ({ ...q, id: questions[index]!.id })),
      };
      await sessions.createSession(session);
      await sessions.putAnswer({
        ...answer,
        sessionId: session.id,
        questionId: questions[0]!.id,
        index: 0,
        status: 'saved',
      });
      await sessions.putAnswer({
        ...answer,
        sessionId: session.id,
        questionId: questions[1]!.id,
        index: 1,
        status: 'draft',
      });
      await sessions.putAnswer({
        ...answer,
        sessionId: session.id,
        questionId: questions[2]!.id,
        index: 2,
        status: 'skipped',
      });
    }
    expect((await upcomingPosts(jobs, sessions)).posts).toEqual([
      {
        id: post.id,
        company: 'Example employer',
        role: 'Software engineer',
        interviewDate: '2026-11-11',
        total: 8,
        answered: 1,
      },
    ]);
    for (const session of (await sessions.listSessions()).sessions)
      await sessions.deleteSession(session.id);
    expect((await upcomingPosts(jobs, sessions)).posts[0]?.answered).toBe(0);
    jobs.setInterviewDate(post.id, null);
    expect(await upcomingPosts(jobs, sessions)).toEqual({ posts: [] });
  } finally {
    db.close();
  }
});

it('TC-182 a saved original remains answered during a retry; mismatched slots and empty drafts do not count', () => {
  const original = { ...answer, questionId: record.questions[0]!.id };
  const retry = { ...completeAttempt(original), status: 'draft' as const, transcript: '' };
  expect([...answeredQuestionIds([{ session: record, answers: [retry] }])]).toEqual([
    original.questionId,
  ]);
  expect([
    ...answeredQuestionIds([
      {
        session: record,
        answers: [
          { ...original, index: 1 },
          { ...original, status: 'submitted', transcript: ' ' },
        ],
      },
    ]),
  ]).toEqual([]);
});
