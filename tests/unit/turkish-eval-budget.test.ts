import { normalizeFeedback } from '@/lib/feedback/normalize';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { getEnv, resetEnvForTests } from '@/lib/env';
import { feedbackOutputLimit } from '@/lib/feedback/limits';
import { preflightEvaluation, runEvaluation } from '@/lib/eval/runner';
import { getTurkishEvalQuestions } from '@/lib/eval/turkish';
import { InvalidOutputError, type LlmProvider } from '@/lib/llm/provider';
import { EvalResultsSchema } from '@/lib/eval/results-schema';
import { feedbackLlm } from '../fixtures/feedback';
import thresholds from '@/eval/thresholds.json';

const source = readFileSync('eval/golden-tr.jsonl', 'utf8');
function input() {
  return {
    source,
    thresholds,
    bank: getTurkishEvalQuestions(),
    env: {
      ...getEnv(),
      LLM_MODE: 'live' as const,
      PRICE_INPUT_PER_MTOK: 1,
      PRICE_OUTPUT_PER_MTOK: 2,
      PRICE_CACHED_INPUT_PER_MTOK: 0.5,
    },
    options: {
      language: 'tr' as const,
      mock: false,
      noGate: true,
      repeats: 1,
      only: ['g-01'],
      budget: 1,
    },
    runId: 'test',
    gitSha: 'test',
    now: () => 1000,
  };
}
describe('TC-217 owner TC-207 diagnostics and Turkish output budget', () => {
  it('defaults to 1400 only for Turkish; rejects values outside the approved bounds', () => {
    expect(feedbackOutputLimit(getEnv(), 'en')).toBe(900);
    expect(feedbackOutputLimit(getEnv(), 'tr')).toBe(1400);
    for (const value of ['299', '4001']) {
      vi.stubEnv('MAX_OUTPUT_TOKENS_FEEDBACK_TR', value);
      resetEnvForTests();
      expect(getEnv).toThrow();
    }
    vi.unstubAllEnvs();
    resetEnvForTests();
  });
  it.each([false, true])(
    'retains failed attempt usage and cost, terminal failure=%s',
    async (terminal) => {
      let calls = 0;
      const provider: LlmProvider = {
        modelId: 'fake-no-network',
        async generateStructured(args) {
          await Promise.resolve();
          calls++;
          expect(args.maxOutputTokens).toBe(1400);
          if (terminal || calls === 1)
            throw new InvalidOutputError(
              'truncated',
              { inputTokens: 100, outputTokens: 900, cachedInputTokens: 20 },
              'length',
            );
          return {
            object: args.schema.parse(feedbackLlm()),
            usage: { inputTokens: 100, outputTokens: 600, cachedInputTokens: 20 },
            finishReason: 'stop',
          };
        },
      };
      const result = await runEvaluation({ ...input(), provider });
      const item = result.results.items[0]!;
      expect(calls).toBe(2);
      expect(item.attemptDiagnostics?.[0]).toMatchObject({
        attempt: 1,
        outcome: 'invalid',
        invalidReason: 'truncated',
        finishReason: 'length',
        usage: { outputTokens: 900 },
      });
      expect(item.ok).toBe(!terminal);
      expect(item.usage).toEqual({ inputTokens: 200, outputTokens: terminal ? 1800 : 1500 });
      expect(item.costUsd).toBeCloseTo(terminal ? 0.00378 : 0.00318, 8);
      expect(result.results.metrics['cost_usd.total']).toBeCloseTo(item.costUsd, 8);
      expect(EvalResultsSchema.safeParse(result.results).success).toBe(true);
      expect(
        EvalResultsSchema.safeParse({
          ...result.results,
          items: [
            { ...item, attemptDiagnostics: [{ ...item.attemptDiagnostics![0], text: 'private' }] },
          ],
        }).success,
      ).toBe(false);
    },
  );
  it('preflights without a provider and shares the selected budget with execution', () => {
    const plan = preflightEvaluation(input());
    expect(plan).toMatchObject({
      calls: 1,
      maxAttempts: 2,
      maxOutputTokens: 1400,
      promptVersion: 'feedback-tr-v2',
    });
    expect(plan.estimate).toBeGreaterThan(0);
    const smaller = preflightEvaluation({
      ...input(),
      env: { ...input().env, MAX_OUTPUT_TOKENS_FEEDBACK_TR: 900 },
    });
    expect(plan.estimate - smaller.estimate).toBeCloseTo(0.002, 8);
  });
});

it('TC-217 identifies normalisation failures without content', () => {
  const context = { transcript: 'I delivered the project', words: 100 };
  const score = feedbackLlm();
  score.scores.structure.score = 5;
  expect(() => normalizeFeedback(score, context)).toThrow(
    expect.objectContaining({ reason: 'score_range' }),
  );
  const rationale = feedbackLlm();
  rationale.scores.structure.rationale = ' ';
  expect(() => normalizeFeedback(rationale, context)).toThrow(
    expect.objectContaining({ reason: 'empty_rationale' }),
  );
  const lowest = feedbackLlm();
  lowest.scores.ownership.score = 1;
  expect(() => normalizeFeedback(lowest, context)).toThrow(
    expect.objectContaining({ reason: 'lowest_dimension_improvement_missing' }),
  );
  const final = feedbackLlm();
  final.model_answer_outline = [' ', ' ', ' '];
  expect(() => normalizeFeedback(final, context)).toThrow(
    expect.objectContaining({ reason: 'final_schema' }),
  );
});
