import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from '@/lib/cost/estimate';

describe('TC-066 UT-29 token cost', () => {
  const prices = { input: 2, cachedInput: 0.5, output: 8 };
  it.each([
    [0, 0.006],
    [400, 0.0054],
    [1000, 0.0045],
    [1200, 0.0046],
  ])('charges cached input separately (%i tokens)', (cachedInputTokens, expected) => {
    expect(
      estimateCostUsd({ inputTokens: 1000, outputTokens: 500, cachedInputTokens }, prices),
    ).toBeCloseTo(expected, 10);
  });
  it('returns zero for zero prices and for zero usage', () => {
    expect(
      estimateCostUsd(
        { inputTokens: 1000, outputTokens: 500, cachedInputTokens: 200 },
        { input: 0, output: 0, cachedInput: 0 },
      ),
    ).toBe(0);
    expect(estimateCostUsd({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }, prices)).toBe(
      0,
    );
  });
});
