import 'server-only';
import { LLM } from '@/lib/config';

export class EvalBudgetError extends Error {}

export function estimateEvalCost(
  promptChars: readonly number[],
  prices: { input: number; output: number },
  maxOutputTokens: number,
): number {
  return promptChars.reduce(
    (sum, chars) =>
      sum +
      (LLM.FEEDBACK_MAX_ATTEMPTS *
        (Math.ceil(chars / 3.5) * prices.input + maxOutputTokens * prices.output)) /
        1_000_000,
    0,
  );
}

export function createBudgetGuard(args: {
  mock: boolean;
  budget: number;
  prices: { input: number; output: number };
  promptChars: readonly number[];
  maxOutputTokens: number;
}) {
  const estimate = estimateEvalCost(args.promptChars, args.prices, args.maxOutputTokens);
  if (!args.mock && (args.prices.input === 0 || args.prices.output === 0))
    throw new EvalBudgetError('Set PRICE_* to the current prices before a live eval');
  if (!args.mock && estimate > args.budget)
    throw new EvalBudgetError(
      `Estimated eval cost ${estimate.toFixed(6)} exceeds budget ${args.budget.toFixed(6)}`,
    );
  let total = 0;
  return {
    estimate,
    get total() {
      return total;
    },
    get exceeded() {
      return !args.mock && total > args.budget;
    },
    add(cost: number) {
      total += cost;
    },
  };
}
