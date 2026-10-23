import 'server-only';
import { createHash } from 'node:crypto';
import { DIMENSIONS, EVAL } from '@/lib/config';
import type { Env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { generateFeedback } from '@/lib/feedback/generate';
import type { LlmProvider, LlmUsage } from '@/lib/llm/provider';
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackUserMessage } from '@/lib/prompts/feedback';
import { FEEDBACK_PROMPT_VERSION } from '@/lib/prompts/version';
import type { Question } from '@/lib/questions/schema';
import { createBudgetGuard } from './budget';
import { validateGolden } from './golden-schema';
import { computeMetrics, containsCanary, gateMetrics, ThresholdsSchema } from './metrics';
import { EvalResultsSchema, type EvalItemResult } from './results-schema';

export type EvalOptions = {
  mock: boolean;
  noGate: boolean;
  repeats: number;
  only: string[] | undefined;
  budget: number;
};

export async function runEvaluation(args: {
  source: string;
  thresholds: unknown;
  bank: { questions: readonly Question[]; bankVersion: string };
  provider: LlmProvider;
  env: Env;
  options: EvalOptions;
  runId: string;
  gitSha: string;
  now?: () => number;
}) {
  const now = args.now ?? Date.now;
  const startedAt = new Date(now()).toISOString();
  const { options, env, bank } = args;
  if (options.mock !== (env.LLM_MODE === 'mock'))
    throw new Error('Use --mock only with LLM_MODE=mock');
  const all = validateGolden(args.source, bank.questions);
  if (options.only?.some((id) => !all.some((item) => item.id === id)))
    throw new Error('Unknown golden id in --only');
  const items = options.only ? all.filter((item) => options.only?.includes(item.id)) : all;
  if (
    !items.length ||
    !Number.isInteger(options.repeats) ||
    options.repeats < 1 ||
    !Number.isFinite(options.budget) ||
    options.budget <= 0
  )
    throw new Error('Eval needs items, positive integer repeats and a positive budget');
  const thresholds = ThresholdsSchema.parse(args.thresholds);
  const byId = new Map(bank.questions.map((question) => [question.id, question]));
  const jobs = items.flatMap((item) =>
    Array.from({ length: options.repeats }, (_, index) => {
      const question = byId.get(item.question_id);
      if (!question) throw new Error('Golden question missing');
      return { item, question, repeat: index + 1 };
    }),
  );
  const prices = {
    input: env.PRICE_INPUT_PER_MTOK,
    output: env.PRICE_OUTPUT_PER_MTOK,
    cachedInput: env.PRICE_CACHED_INPUT_PER_MTOK,
  };
  const guard = createBudgetGuard({
    mock: options.mock,
    budget: options.budget,
    prices,
    maxOutputTokens: env.MAX_OUTPUT_TOKENS_FEEDBACK,
    promptChars: jobs.map(
      ({ item, question }) =>
        FEEDBACK_SYSTEM_PROMPT.length + buildFeedbackUserMessage({ ...item, question }).length,
    ),
  });
  let next = 0;
  const calls: EvalItemResult[] = [];
  async function worker() {
    while (!guard.exceeded) {
      const job = jobs[next++];
      if (!job) return;
      const start = now();
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
      let attempts = 0;
      const provider: LlmProvider = {
        modelId: args.provider.modelId,
        async generateStructured(input) {
          attempts++;
          const response = await args.provider.generateStructured(input);
          usage.inputTokens += response.usage.inputTokens;
          usage.outputTokens += response.usage.outputTokens;
          usage.cachedInputTokens += response.usage.cachedInputTokens;
          return response;
        },
      };
      const cost = () => (options.mock ? 0 : estimateCostUsd(usage, prices));
      let call: EvalItemResult;
      try {
        const result = await generateFeedback({
          ...job.item,
          question: job.question,
          provider,
          maxOutputTokens: env.MAX_OUTPUT_TOKENS_FEEDBACK,
          now,
        });
        const feedback = result.feedback;
        call = {
          id: job.item.id,
          repeat: job.repeat,
          ok: true,
          error: null,
          scores: Object.fromEntries(DIMENSIONS.map((d) => [d, feedback.scores[d].score])),
          overall: feedback.overall,
          flags: feedback.flags,
          inRange: Object.fromEntries(
            DIMENSIONS.map((d) => [
              d,
              feedback.scores[d].score >= job.item.expected[d][0] &&
                feedback.scores[d].score <= job.item.expected[d][1],
            ]),
          ),
          canaryLeak: job.item.canary === null ? null : containsCanary(feedback, job.item.canary),
          attempts,
          latencyMs: Math.max(0, now() - start),
          usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
          costUsd: cost(),
          feedback,
        };
      } catch (error) {
        call = {
          id: job.item.id,
          repeat: job.repeat,
          ok: false,
          error: error instanceof AppError ? error.code : 'PROVIDER_ERROR',
          scores: null,
          overall: null,
          flags: null,
          inRange: null,
          canaryLeak: null,
          attempts,
          latencyMs: Math.max(0, now() - start),
          usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
          costUsd: cost(),
          feedback: null,
        };
      }
      guard.add(call.costUsd);
      calls.push(call);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(EVAL.CONCURRENCY, jobs.length) }, () => worker()),
  );
  calls.sort((a, b) => a.id.localeCompare(b.id) || a.repeat - b.repeat);
  const metrics = computeMetrics(items, calls, options.repeats);
  const gate = gateMetrics(
    metrics,
    thresholds,
    options.only !== undefined && items.length < all.length,
  );
  if (guard.exceeded) gate.failures.push('budget_exceeded');
  const results = EvalResultsSchema.parse({
    runId: args.runId,
    startedAt,
    finishedAt: new Date(now()).toISOString(),
    gitSha: args.gitSha,
    model: args.provider.modelId,
    promptVersion: FEEDBACK_PROMPT_VERSION,
    bankVersion: bank.bankVersion,
    goldenHash: createHash('sha256').update(args.source).digest('hex'),
    repeats: options.repeats,
    metrics,
    thresholds: gate.thresholds,
    passed: gate.failures.length === 0,
    failures: gate.failures,
    items: calls,
  });
  return {
    results,
    estimate: guard.estimate,
    exitCode: guard.exceeded ? 2 : options.noGate || results.passed ? 0 : 1,
  };
}
