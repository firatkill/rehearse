import 'server-only';
import { z } from 'zod';
import { FeedbackSchema } from '@/lib/feedback/schema';

export const EvalResultsSchema = z.object({
  runId: z.string(),
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Preserve the normative TRD 18.6 schema.
  startedAt: z.string().datetime(),
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Preserve the normative TRD 18.6 schema.
  finishedAt: z.string().datetime(),
  gitSha: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  bankVersion: z.string(),
  goldenHash: z.string(), // sha256 of golden.jsonl
  repeats: z.number().int(),
  metrics: z.record(z.string(), z.number()), // flattened, e.g. "within_range.structure"
  thresholds: z.record(z.string(), z.number()),
  passed: z.boolean(),
  failures: z.array(z.string()),
  items: z.array(
    z.object({
      id: z.string(),
      repeat: z.number().int(),
      ok: z.boolean(),
      error: z.string().nullable(),
      scores: z.record(z.string(), z.number()).nullable(),
      overall: z.number().nullable(),
      flags: z.record(z.string(), z.boolean()).nullable(),
      inRange: z.record(z.string(), z.boolean()).nullable(),
      canaryLeak: z.boolean().nullable(),
      attempts: z.number().int(),
      latencyMs: z.number().int(),
      usage: z.object({ inputTokens: z.number().int(), outputTokens: z.number().int() }),
      costUsd: z.number(),
      feedback: FeedbackSchema.nullable(), // kept for human review of golden answers (fictional text only)
    }),
  ),
});
export type EvalResults = z.infer<typeof EvalResultsSchema>;
export type EvalItemResult = EvalResults['items'][number];
