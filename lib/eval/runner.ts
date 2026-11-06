import 'server-only';
import { createHash } from 'node:crypto';
import { DIMENSIONS, EVAL, LLM, type Language } from '@/lib/config';
import type { Env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { feedbackOutputLimit } from '@/lib/feedback/limits';
import { generateFeedback, type FeedbackAttempt } from '@/lib/feedback/generate';
import type { LlmProvider, LlmUsage } from '@/lib/llm/provider';
import { feedbackPrompt } from '@/lib/prompts/language';
import type { Question } from '@/lib/questions/schema';
import { createBudgetGuard } from './budget';
import { validateGolden, validateFollowUpGolden } from './golden-schema';
import { computeMetrics, containsCanary, gateMetrics, ThresholdsSchema } from './metrics';
import { EvalResultsSchema, type EvalItemResult } from './results-schema';

export type EvalOptions = {
  language?: Language;
  suite?: 'golden' | 'follow-up';
  mock: boolean;
  noGate: boolean;
  repeats: number;
  only: string[] | undefined;
  budget: number;
};

type EvaluationPlanInput = {
  source: string;
  thresholds: unknown;
  bank: { questions: readonly Question[]; bankVersion: string };
  env: Env;
  options: EvalOptions;
};
function planEvaluation(args: EvaluationPlanInput) {
  const { options, env, bank } = args;
  const selectedPrompt = feedbackPrompt(options.language);
  const maxOutputTokens = feedbackOutputLimit(env, options.language);
  if (options.mock !== (env.LLM_MODE === 'mock'))
    throw new Error('Use --mock only with LLM_MODE=mock');
  const all =
    options.suite === 'follow-up'
      ? validateFollowUpGolden(args.source, bank.questions)
      : validateGolden(args.source, bank.questions);
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
    maxOutputTokens,
    promptChars: jobs.map(
      ({ item, question }) =>
        selectedPrompt.system.length + selectedPrompt.build({ ...item, question }).length,
    ),
  });
  return {
    options,
    bank,
    selectedPrompt,
    maxOutputTokens,
    all,
    items,
    thresholds,
    jobs,
    prices,
    guard,
  };
}
export function preflightEvaluation(args: EvaluationPlanInput) {
  const plan = planEvaluation(args);
  return {
    calls: plan.jobs.length,
    maxAttempts: plan.jobs.length * LLM.FEEDBACK_MAX_ATTEMPTS,
    maxOutputTokens: plan.maxOutputTokens,
    promptVersion: plan.selectedPrompt.version,
    estimate: plan.guard.estimate,
  };
}

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
  const {
    options,
    bank,
    selectedPrompt,
    maxOutputTokens,
    all,
    items,
    thresholds,
    jobs,
    prices,
    guard,
  } = planEvaluation(args);
  let next = 0;
  const calls: EvalItemResult[] = [];
  async function worker() {
    while (!guard.exceeded) {
      const job = jobs[next++];
      if (!job) return;
      const start = now();
      const usage: LlmUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
      let attempts = 0;
      const attemptDiagnostics: FeedbackAttempt[] = [];
      const onAttempt = (attempt: FeedbackAttempt) => {
        attempts++;
        attemptDiagnostics.push(attempt);
        if (attempt.usage) {
          usage.inputTokens += attempt.usage.inputTokens;
          usage.outputTokens += attempt.usage.outputTokens;
          usage.cachedInputTokens += attempt.usage.cachedInputTokens;
        }
      };
      const cost = () => (options.mock ? 0 : estimateCostUsd(usage, prices));
      let call: EvalItemResult;
      try {
        const result = await generateFeedback({
          ...job.item,
          language: options.language ?? 'en',
          question: job.question,
          provider: args.provider,
          onAttempt,
          maxOutputTokens,
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
          attemptDiagnostics,
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
          attemptDiagnostics,
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
    options.suite === 'follow-up' || (options.only !== undefined && items.length < all.length),
  );
  if (guard.exceeded) gate.failures.push('budget_exceeded');
  const results = EvalResultsSchema.parse({
    runId: args.runId,
    startedAt,
    finishedAt: new Date(now()).toISOString(),
    gitSha: args.gitSha,
    model: args.provider.modelId,
    promptVersion: selectedPrompt.version,
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
