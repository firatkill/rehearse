import { describe, expect, it } from 'vitest';
import { createBudgetGuard, estimateEvalCost } from '@/lib/eval/budget';
import { LLM } from '@/lib/config';
const args = {
  mock: false,
  budget: 1,
  prices: { input: 1, output: 2 },
  promptChars: [8, 14],
  maxOutputTokens: 100,
};
describe('TC-105 FR-49 UT-38 budget guard', () => {
  it('estimates every attempt with ceiling chars/3.5 and maximum output', () => {
    expect(estimateEvalCost(args.promptChars, args.prices, args.maxOutputTokens)).toBe(
      (LLM.FEEDBACK_MAX_ATTEMPTS * (3 + 4 + 400)) / 1e6,
    );
    expect(() => createBudgetGuard({ ...args, budget: 0.0001 })).toThrow(/Estimated eval cost/);
    expect(createBudgetGuard({ ...args, budget: 0.000814 }).estimate).toBeCloseTo(0.000814);
  });
  it.each([
    { input: 0, output: 1 },
    { input: 1, output: 0 },
  ])('refuses live zero prices %j', (prices) => {
    expect(() => createBudgetGuard({ ...args, prices })).toThrow('Set PRICE_*');
  });
  it('stops only after exceeding budget and skips all guards in mock mode', () => {
    const guard = createBudgetGuard(args);
    guard.add(0.4);
    guard.add(0.6);
    expect(guard.total).toBe(1);
    expect(guard.exceeded).toBe(false);
    guard.add(0.01);
    expect(guard.exceeded).toBe(true);
    const mock = createBudgetGuard({
      ...args,
      mock: true,
      budget: 0.000001,
      prices: { input: 0, output: 0 },
    });
    mock.add(100);
    expect(mock.exceeded).toBe(false);
  });
});
