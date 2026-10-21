import 'server-only';
import type { LlmUsage } from '@/lib/llm/provider';

export function estimateCostUsd(
  u: LlmUsage,
  p: { input: number; output: number; cachedInput: number },
): number {
  const uncached = Math.max(0, u.inputTokens - u.cachedInputTokens);
  return (
    (uncached * p.input + u.cachedInputTokens * p.cachedInput + u.outputTokens * p.output) /
    1_000_000
  );
}
