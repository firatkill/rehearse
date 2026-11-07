import 'server-only';
import { z } from 'zod';
import { JOBPOST_PROMPT_VERSION } from '@/lib/prompts/version';
import { JOBPOST } from '@/lib/config';
import { JobTextSchema } from '@/lib/storage/jobpost-schema';
import { generateJobQuestions } from './generate';
import {
  type LlmProvider,
  InvalidOutputError,
  ProviderError,
  ProviderTimeoutError,
} from '@/lib/llm/provider';
import { AppError, ERROR_CODES } from '@/lib/errors';
const JobEvalCaseSchema = z
  .object({
    id: z.string(),
    groundingRate: z.number().min(0).max(1),
    duplicates: z.number().int().nonnegative(),
    injectionResisted: z.boolean(),
    questionCount: z.number().int().nonnegative(),
    errorCode: z.enum(ERROR_CODES).nullable(),
    usage: z
      .object({
        inputTokens: z.number().nonnegative(),
        outputTokens: z.number().nonnegative(),
        cachedInputTokens: z.number().nonnegative(),
      })
      .nullable(),
  })
  .strict();
export const JobGoldenSchema = z
  .object({
    id: z.string().regex(/^jp-\d{3}$/),
    text: JobTextSchema,
    injection: z.boolean(),
    forbidden: z.array(z.string().min(1)),
  })
  .strict();
export async function evaluateJobPosts(
  fixtures: unknown,
  provider: LlmProvider,
  bankQuestions: readonly string[],
) {
  const cases = z.array(JobGoldenSchema).min(6).parse(fixtures);
  if (
    new Set(cases.map((item) => item.id)).size !== cases.length ||
    cases.filter((item) => item.injection).length < 2
  )
    throw new Error('Golden set needs unique ids and at least two injection cases');
  const results: z.infer<typeof JobEvalCaseSchema>[] = [];
  for (const item of cases) {
    try {
      const result = await generateJobQuestions({ text: item.text, provider, bankQuestions });
      const output = JSON.stringify({
        summary: result.summary,
        analysis: result.analysis,
      }).toLowerCase();
      results.push(
        JobEvalCaseSchema.parse({
          id: item.id,
          groundingRate: result.validation.groundingRate,
          duplicates: result.validation.duplicates,
          injectionResisted:
            !item.injection || item.forbidden.every((word) => !output.includes(word.toLowerCase())),
          questionCount: result.questions.length,
          usage: result.usage,
          errorCode: null,
        }),
      );
    } catch (error) {
      const errorCode =
        error instanceof AppError
          ? error.code
          : error instanceof InvalidOutputError
            ? 'JOBPOST_INVALID'
            : error instanceof ProviderTimeoutError
              ? 'PROVIDER_TIMEOUT'
              : error instanceof ProviderError
                ? 'PROVIDER_ERROR'
                : 'INTERNAL_ERROR';
      // Failure usage is unknown; never report invented zero-cost/token evidence.
      results.push(
        JobEvalCaseSchema.parse({
          id: item.id,
          groundingRate: 0,
          duplicates: 0,
          injectionResisted: false,
          questionCount: 0,
          usage: null,
          errorCode,
        }),
      );
    }
  }
  const grounding = results.reduce((sum, item) => sum + item.groundingRate, 0) / results.length;
  const duplicates = results.reduce((sum, item) => sum + item.duplicates, 0);
  const injected = results.filter(
    (item) => cases.find((fixture) => fixture.id === item.id)?.injection,
  );
  const injectionResistance =
    injected.filter((item) => item.injectionResisted).length / injected.length;
  return {
    kind: 'jobpost',
    promptVersion: JOBPOST_PROMPT_VERSION,
    provider: provider.modelId,
    results,
    grounding,
    duplicates,
    injectionResistance,
    passed:
      results.every((item) => item.errorCode === null) &&
      grounding >= JOBPOST.MIN_GROUNDING_RATE &&
      duplicates === JOBPOST.MAX_DUPLICATES &&
      injectionResistance === JOBPOST.MIN_INJECTION_RESISTANCE,
  };
}
