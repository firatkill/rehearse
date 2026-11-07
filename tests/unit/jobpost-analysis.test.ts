import { expect, it } from 'vitest';
import { analyzeJobPost } from '@/lib/jobpost/analyze';
import { generateJobQuestions } from '@/lib/jobpost/generate';
import { mockJobAnalysis, mockJobpostOutput } from '@/lib/jobpost/mock';
import { createJobRepository } from '@/lib/jobpost/repository';
import { openSqlite } from '@/lib/storage/sqlite/repository';
import type { LlmProvider } from '@/lib/llm/provider';
import { jobText } from '../fixtures/jobpost';
const usage = { inputTokens: 10, outputTokens: 20, cachedInputTokens: 0 };
it.each(['en', 'tr'] as const)(
  'TC-223 %s analysis is grounded and precedes question generation',
  async (language) => {
    const calls: string[] = [];
    const provider: LlmProvider = {
      modelId: 'fixture',
      async generateStructured(args) {
        await Promise.resolve();
        calls.push(args.schemaName);
        const analysis = args.schemaName.startsWith('jobpost_analysis');
        if (!analysis) expect(args.prompt).toContain('<analysis>');
        return {
          object: args.schema.parse(
            analysis ? mockJobAnalysis(args.prompt) : mockJobpostOutput(args.prompt),
          ),
          usage,
        };
      },
    };
    const result = await generateJobQuestions({
      text: jobText,
      language,
      provider,
      bankQuestions: [],
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toBe(language === 'tr' ? 'jobpost_analysis_tr' : 'jobpost_analysis');
    expect(result.questions).toHaveLength(8);
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 40, cachedInputTokens: 0 });
  },
);
it('TC-223 an absent analysis quote prevents question generation', async () => {
  const provider: LlmProvider = {
    modelId: 'fixture',
    async generateStructured(args) {
      await Promise.resolve();
      const analysis = mockJobAnalysis(args.prompt);
      return {
        object: args.schema.parse({
          ...analysis,
          roleSummary: {
            text: 'Invented',
            groundingQuote: 'This requirement is absent from the original job post.',
          },
        }),
        usage,
      };
    },
  };
  await expect(analyzeJobPost(jobText, 'en', provider)).rejects.toMatchObject({
    code: 'JOBPOST_INVALID',
  });
});
it('TC-223 persisted analysis survives reload; editing invalidates it and rejects stale saves', () => {
  const db = openSqlite(':memory:');
  try {
    const repo = createJobRepository(db);
    const post = repo.create(jobText);
    const analysis = {
      ...mockJobAnalysis(`<job_post>\n${jobText}\n</job_post>`),
      model: 'fixture',
      promptVersion: 'jobpost-v3',
    };
    repo.saveAnalysis(post.id, analysis, jobText);
    expect(createJobRepository(db).get(post.id)?.analysis).toEqual(analysis);
    repo.updateText(post.id, `${jobText} New requirement.`);
    expect(repo.get(post.id)?.analysis).toBeNull();
    expect(() => repo.saveAnalysis(post.id, analysis, jobText)).toThrow();
  } finally {
    db.close();
  }
});

it('TC-223 UT-14 previous job records upgrade without inventing analysis', async () => {
  const { migrateJobRecord, V3JobPostRecordSchema } = await import('@/lib/storage/jobpost-schema');
  const { migrateExport } = await import('@/lib/storage/export');
  const { jobRecord } = await import('../fixtures/job-record');
  const previous = V3JobPostRecordSchema.strip().parse({ ...jobRecord.post, schemaVersion: 3 });
  expect(migrateJobRecord(previous)).toEqual(jobRecord.post);
  expect(
    migrateExport({
      format: 'rehearse-export',
      formatVersion: 9,
      exportedAt: '2026-11-07T00:00:00.000Z',
      appVersion: '1.0.0',
      sessions: [],
      jobPosts: [previous],
      generatedQuestions: [],
    }),
  ).toMatchObject({ formatVersion: 10, jobPosts: [jobRecord.post] });
});
