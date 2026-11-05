import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it, vi, afterEach } from 'vitest';
import { openSqlite, createSqliteRepository } from '@/lib/storage/sqlite/repository';
import { createJobRepository } from '@/lib/jobpost/repository';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { createIndexedDbRepository } from '@/lib/storage/idb-repository';
import { openDb, closeDb, requestResult } from '@/lib/storage/idb';
import { MIGRATIONS } from '@/lib/storage/migrations';
import { JobGenerationSchema } from '@/lib/jobpost/schema';
import { mockJobpostOutput } from '@/lib/jobpost/mock';
import { jobpostUserMessage } from '@/lib/prompts/jobpost';
import { evaluateJobPosts } from '@/lib/jobpost/evaluation';
import { createMockProvider } from '@/lib/llm/mock';
import { resetEnvForTests } from '@/lib/env';
import { jobText } from '../fixtures/jobpost';
afterEach(() => {
  vi.unstubAllGlobals();
  resetEnvForTests();
});
it('TC-175 UT-14 upgrade from DB 5 preserves existing stores and adds job data stores', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  const name = randomUUID();
  const request = indexedDB.open(name, 5);
  request.onupgradeneeded = () => {
    for (const migration of MIGRATIONS.filter((item) => item.version <= 5))
      migration.upgrade(request.result, request.transaction!);
  };
  const old = await requestResult(request);
  old.close();
  const db = await openDb(name);
  expect(db.version).toBe(7);
  expect([...db.objectStoreNames]).toEqual([
    'answers',
    'generatedQuestions',
    'jobPosts',
    'meta',
    'sessions',
  ]);
  closeDb(db);
});
it('TC-175 SQLite exports generated metadata; every repository imports it as read-only and preserves it on export', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  const db = openSqlite(':memory:');
  const other = openSqlite(':memory:');
  const browser = await openDb(randomUUID());
  try {
    const jobs = createJobRepository(db);
    const post = jobs.create(jobText);
    const output = JobGenerationSchema.parse(mockJobpostOutput(jobpostUserMessage(jobText, 8)));
    const saved = jobs.commitGeneration(post.id, output, output.questions, 'mock');
    const source = await createSqliteRepository(db).exportAll('test');
    expect(source.formatVersion).toBe(7);
    expect(source.generatedQuestions).toHaveLength(8);
    for (const repo of [
      createMemoryRepository(),
      createIndexedDbRepository(browser),
      createSqliteRepository(other),
    ]) {
      await repo.importAll(new File([JSON.stringify(source)], 'export.json'));
      const roundtrip = await repo.exportAll('test');
      expect(roundtrip.jobPosts).toEqual(source.jobPosts);
      expect(roundtrip.generatedQuestions.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
        source.generatedQuestions
          .map((item) => ({ ...item, origin: 'import' }))
          .toSorted((a, b) => a.id.localeCompare(b.id)),
      );
    }
    expect(createJobRepository(other).generatedQuestion(saved.questions[0]!.id)).toBeNull();
    expect(jobs.generatedQuestion(saved.questions[0]!.id)).not.toBeNull();
    const revision = jobs.updateText(post.id, `${jobText} Additional requirement.`);
    expect(revision.id).not.toBe(post.id);
    expect(jobs.get(post.id)?.text).toBe(jobText);
    await createSqliteRepository(db).deleteAll();
    expect(jobs.list()).toEqual([]);
  } finally {
    db.close();
    other.close();
    closeDb(browser);
  }
});
it('TC-177 six mock golden posts meet grounding, duplicate and injection gates without network', async () => {
  vi.stubEnv('MOCK_LLM_DELAY_MS', '0');
  resetEnvForTests();
  const fixtures = readdirSync('eval/golden-jobposts')
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(`eval/golden-jobposts/${name}`, 'utf8')) as unknown);
  const result = await evaluateJobPosts(fixtures, createMockProvider(), []);
  expect(result.results).toHaveLength(6);
  expect(result).toMatchObject({
    passed: true,
    grounding: 1,
    duplicates: 0,
    injectionResistance: 1,
  });
});

it('TC-177 golden gates fail for injected output and duplicates even when eight usable questions remain', async () => {
  const fixtures = readdirSync('eval/golden-jobposts')
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(`eval/golden-jobposts/${name}`, 'utf8')) as unknown);
  const result = await evaluateJobPosts(
    fixtures,
    {
      modelId: 'fake',
      async generateStructured(args) {
        await Promise.resolve();
        const output = JobGenerationSchema.parse(mockJobpostOutput(args.prompt));
        return {
          object: args.schema.parse({
            ...output,
            about: 'PWNED_RETAIL PWNED_SCHOOL',
            questions: [...output.questions, output.questions[0]],
          }),
          usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
        };
      },
    },
    [],
  );
  expect(result.passed).toBe(false);
  expect(result.duplicates).toBe(6);
  expect(result.injectionResistance).toBe(0);
});

it('TC-179 appending five keeps original summary and ids; duplicate commit is atomic', () => {
  const db = openSqlite(':memory:');
  try {
    const repo = createJobRepository(db);
    const post = repo.create(jobText);
    const first = JobGenerationSchema.parse(mockJobpostOutput(jobpostUserMessage(jobText, 8)));
    const saved = repo.commitGeneration(post.id, first, first.questions, 'mock');
    const extra = JobGenerationSchema.parse(
      mockJobpostOutput(
        jobpostUserMessage(
          jobText,
          5,
          saved.questions.map((q) => q.text),
        ),
      ),
    );
    expect(extra.questions).toHaveLength(5);
    const appended = repo.commitGeneration(
      post.id,
      { ...extra, role: 'Different role', company: 'Changed company' },
      extra.questions,
      'mock',
    );
    expect(appended.questions).toHaveLength(13);
    expect(appended.questions.slice(0, 8)).toEqual(saved.questions);
    expect(appended.post.role).toBe(saved.post.role);
    expect(appended.post.company).toBe(saved.post.company);
    expect(() => repo.commitGeneration(post.id, extra, extra.questions, 'mock')).toThrow();
    expect(repo.questions(post.id)).toEqual(appended.questions);
  } finally {
    db.close();
  }
});
