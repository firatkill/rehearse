import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import { EvalResultsSchema } from '@/lib/eval/results-schema';
import { demoFeedback, demoJobs } from '@/lib/demo/content';
import HowItWorksPage from '@/app/how-it-works/page';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8')) as unknown;
it('TC-200 owner feedback-v8 evidence passes and mixed result kinds do not break the write-up', async () => {
  const result = EvalResultsSchema.parse(read('eval/results/2026-11-05-12.json'));
  expect(result.promptVersion).toBe('feedback-v8');
  expect(result.passed).toBe(true);
  expect(result.failures).toEqual([]);
  expect(result.metrics['injection_resistance']).toBe(1);
  expect(result.metrics['cost_usd.total']).toBeCloseTo(0.01855683, 8);
  await expect(HowItWorksPage()).resolves.toBeTruthy();
});
it('TC-200 owner jobpost-v2 evidence records six passing eight-question cases', () => {
  const result = z
    .object({
      kind: z.literal('jobpost'),
      promptVersion: z.literal('jobpost-v2'),
      provider: z.string(),
      model: z.string(),
      gitSha: z.string(),
      finishedAt: z.iso.datetime(),
      grounding: z.literal(1),
      duplicates: z.literal(0),
      injectionResistance: z.literal(1),
      passed: z.literal(true),
      costUsd: z.number().nonnegative(),
      results: z
        .array(
          z
            .object({
              id: z.string(),
              groundingRate: z.literal(1),
              duplicates: z.literal(0),
              injectionResisted: z.literal(true),
              questionCount: z.literal(8),
              errorCode: z.null(),
              usage: z
                .object({
                  inputTokens: z.number().int().nonnegative(),
                  outputTokens: z.number().int().nonnegative(),
                  cachedInputTokens: z.number().int().nonnegative(),
                })
                .strict(),
            })
            .strict(),
        )
        .length(6),
    })
    .strict()
    .parse(read('eval/results/jobposts-2026-11-05-2.json'));
  expect(result.results.map((r) => r.id)).toEqual([
    'jp-001',
    'jp-002',
    'jp-003',
    'jp-004',
    'jp-005',
    'jp-006',
  ]);
  expect(result.costUsd).toBeCloseTo(0.0036705, 8);
});

it('TC-200 owner demo corpus is live and every strong score exceeds medium then weak', () => {
  expect(demoFeedback).toHaveLength(39);
  expect(demoJobs).toHaveLength(3);
  for (const item of demoFeedback) {
    expect(item.provenance).toBe('live');
    const score = (level: 'strong' | 'medium' | 'weak') =>
      item.variants.find((v) => v.level === level)!.feedback.overall;
    expect(score('strong'), item.questionId).toBeGreaterThan(score('medium'));
    expect(score('medium'), item.questionId).toBeGreaterThan(score('weak'));
  }
  expect(demoJobs.every((job) => job.provenance === 'live')).toBe(true);
});

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
