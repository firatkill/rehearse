import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnv } from '@/lib/env';
import { getBank } from '@/lib/questions/bank';
import { runEvaluation, type EvalOptions } from '@/lib/eval/runner';
import { EvalResultsSchema } from '@/lib/eval/results-schema';
import { EVAL } from '@/lib/config';
import { ProviderError, type LlmProvider } from '@/lib/llm/provider';
import { feedbackLlm } from '../fixtures/feedback';
import thresholds from '@/eval/thresholds.json';
const source = readFileSync('eval/golden.jsonl', 'utf8');
const options: EvalOptions = { mock: true, noGate: true, repeats: 2, only: undefined, budget: 0.5 };
function fake(fail = false, tokens = 100) {
  let active = 0,
    peak = 0,
    calls = 0;
  const provider: LlmProvider = {
    modelId: 'fake',
    async generateStructured(args) {
      calls++;
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      if (fail) throw new ProviderError('private provider detail', false);
      return {
        object: args.schema.parse(feedbackLlm()),
        usage: { inputTokens: tokens, outputTokens: tokens, cachedInputTokens: 0 },
      };
    },
  };
  return {
    provider,
    get peak() {
      return peak;
    },
    get calls() {
      return calls;
    },
  };
}
function args(provider: LlmProvider) {
  return {
    source,
    thresholds,
    bank: getBank(),
    provider,
    env: getEnv(),
    options,
    runId: '2026-10-23-1',
    gitSha: 'test-sha',
    now: () => 1000,
  };
}
describe('TC-106 FR-49 eval runner; TC-105 budget scheduling', () => {
  it('uses the feedback pipeline for all repeats within concurrency and records real gate failure despite no-gate', async () => {
    const provider = fake();
    const result = await runEvaluation(args(provider.provider));
    expect(provider.calls).toBe(48);
    expect(provider.peak).toBeLessThanOrEqual(EVAL.CONCURRENCY);
    expect(result.results.items).toHaveLength(48);
    expect(result.exitCode).toBe(0);
    expect(result.results.passed).toBe(false);
    expect(result.results.failures.length).toBeGreaterThan(0);
    expect(result.results.items[0]?.feedback).not.toBeNull();
    expect(result.results.metrics['cost_usd.total']).toBe(0);
    expect(result.results.goldenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(EvalResultsSchema.safeParse(result.results).success).toBe(true);
  });
  it('returns gate exit one and handles provider failures without exposing details', async () => {
    const result = await runEvaluation({
      ...args(fake(true).provider),
      options: { ...options, noGate: false, only: ['g-01'] },
    });
    expect(result.exitCode).toBe(1);
    expect(result.results.items.every((item) => item.error === 'PROVIDER_ERROR' && !item.ok)).toBe(
      true,
    );
    expect(JSON.stringify(result.results)).not.toContain('private provider detail');
    expect(result.results.metrics).not.toHaveProperty('injection_resistance');
    expect(result.results.thresholds).not.toHaveProperty('monotonic.chain');
  });
  it('refuses invalid config and budget before any provider invocation', async () => {
    const provider = fake();
    const input = args(provider.provider);
    await expect(
      runEvaluation({ ...input, options: { ...options, only: ['g-99'] } }),
    ).rejects.toThrow(/Unknown/);
    await expect(runEvaluation({ ...input, options: { ...options, only: [] } })).rejects.toThrow(
      /needs items/,
    );
    await expect(runEvaluation({ ...input, options: { ...options, repeats: 0 } })).rejects.toThrow(
      /positive/,
    );
    await expect(runEvaluation({ ...input, options: { ...options, mock: false } })).rejects.toThrow(
      /LLM_MODE/,
    );
    await expect(
      runEvaluation({
        ...input,
        env: { ...input.env, LLM_MODE: 'live', PRICE_INPUT_PER_MTOK: 1, PRICE_OUTPUT_PER_MTOK: 1 },
        options: { ...options, mock: false, budget: 0.000001 },
      }),
    ).rejects.toThrow(/estimate/i);
    expect(provider.calls).toBe(0);
  });
  it('stops scheduling after actual spend exceeds budget and returns a failed partial result with exit two', async () => {
    const provider = fake(false, 1_000_000);
    const input = args(provider.provider);
    const result = await runEvaluation({
      ...input,
      env: { ...input.env, LLM_MODE: 'live', PRICE_INPUT_PER_MTOK: 1, PRICE_OUTPUT_PER_MTOK: 1 },
      options: { ...options, mock: false, budget: 1 },
    });
    expect(result.exitCode).toBe(2);
    expect(result.results.passed).toBe(false);
    expect(result.results.failures).toContain('budget_exceeded');
    expect(provider.calls).toBeLessThan(48);
    expect(provider.calls).toBeLessThanOrEqual(EVAL.CONCURRENCY);
    expect(result.results.metrics['cost_usd.total']).toBe(provider.calls * 2);
  });
});
