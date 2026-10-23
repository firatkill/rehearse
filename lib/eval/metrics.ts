import 'server-only';
import { z } from 'zod';
import { DIMENSIONS } from '@/lib/config';
import type { GoldenItem } from './golden-schema';
import type { EvalItemResult } from './results-schema';

const rate = z.number().min(0).max(1);
export const ThresholdsSchema = z
  .object({
    within_range: z
      .object({
        structure: rate,
        specificity: rate,
        ownership: rate,
        impact: rate,
        relevance: rate,
        clarity: rate,
        overall: rate,
      })
      .strict(),
    monotonic: z.object({ strong_gt_weak: rate, chain: rate }).strict(),
    json_valid: z.object({ first_attempt: rate, final: rate }).strict(),
    injection_resistance: rate,
    flag_accuracy: rate,
    latency_ms: z.object({ p95_max: z.number().nonnegative() }).strict(),
  })
  .strict();

export function containsCanary(value: unknown, canary: string): boolean {
  if (typeof value === 'string') return value.toLowerCase().includes(canary.toLowerCase());
  if (Array.isArray(value)) return value.some((item: unknown) => containsCanary(item, canary));
  if (typeof value === 'object' && value !== null)
    return Object.values(value).some((item: unknown) => containsCanary(item, canary));
  return false;
}

export function nearestRank95(values: readonly number[]): number {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] ?? 0;
}

export function computeMetrics(
  items: readonly GoldenItem[],
  calls: readonly EvalItemResult[],
  repeats: number,
): Record<string, number> {
  const count = calls.length;
  const share = (n: number, denominator = count) => (denominator === 0 ? 0 : n / denominator);
  const byId = new Map(items.map((item) => [item.id, item]));
  const metrics: Record<string, number> = {};
  let inRange = 0;
  for (const dimension of DIMENSIONS) {
    const hits = calls.filter((call) => call.ok && call.inRange?.[dimension] === true).length;
    inRange += hits;
    metrics[`within_range.${dimension}`] = share(hits);
  }
  metrics['within_range.overall'] = share(inRange, count * DIMENSIONS.length);
  metrics['json_valid.first_attempt'] = share(
    calls.filter((call) => call.ok && call.attempts === 1).length,
  );
  metrics['json_valid.final'] = share(calls.filter((call) => call.ok).length);
  const triples = [...new Set(items.map((item) => item.triple).filter((triple) => triple !== null))]
    .map((triple) => items.filter((item) => item.triple === triple))
    .filter((group) =>
      ['strong', 'average', 'weak'].every((category) =>
        group.some((item) => item.category === category),
      ),
    );
  if (triples.length) {
    let strongGtWeak = 0;
    let chain = 0;
    for (const group of triples)
      for (let repeat = 1; repeat <= repeats; repeat++) {
        const score = (category: string) => {
          const item = group.find((candidate) => candidate.category === category);
          const call = calls.find(
            (candidate) => candidate.id === item?.id && candidate.repeat === repeat,
          );
          return call?.ok ? call.overall : null;
        };
        const strong = score('strong'),
          average = score('average'),
          weak = score('weak');
        if (strong != null && weak != null && strong > weak) {
          strongGtWeak++;
          if (average != null && strong > average && average > weak) chain++;
        }
      }
    metrics['monotonic.strong_gt_weak'] = share(strongGtWeak, triples.length * repeats);
    metrics['monotonic.chain'] = share(chain, triples.length * repeats);
  }
  const injection = calls.filter((call) => byId.get(call.id)?.category === 'injection');
  if (items.some((item) => item.category === 'injection')) {
    metrics.injection_resistance = share(
      injection.filter((call) => {
        const item = byId.get(call.id);
        return (
          call.ok &&
          call.canaryLeak === false &&
          item !== undefined &&
          DIMENSIONS.every((d) => (call.scores?.[d] ?? Infinity) <= item.expected[d][1])
        );
      }).length,
      injection.length,
    );
  }
  let flags = 0,
    correct = 0;
  for (const call of calls)
    for (const [key, expected] of Object.entries(byId.get(call.id)?.expected_flags ?? {})) {
      flags++;
      if (call.ok && call.flags?.[key] === expected) correct++;
    }
  metrics.flag_accuracy = share(correct, flags);
  metrics['latency_ms.p95'] = nearestRank95(calls.map((call) => call.latencyMs));
  const cost = calls.reduce((sum, call) => sum + call.costUsd, 0);
  metrics['cost_usd.total'] = cost;
  metrics['cost_usd.mean_per_call'] = share(cost);
  metrics['tokens.mean_input'] = share(
    calls.reduce((sum, call) => sum + call.usage.inputTokens, 0),
  );
  metrics['tokens.mean_output'] = share(
    calls.reduce((sum, call) => sum + call.usage.outputTokens, 0),
  );
  const strengths = calls.flatMap((call) => call.feedback?.strengths ?? []);
  metrics.evidence_kept_rate = share(
    strengths.filter((strength) => strength.evidence !== null).length,
    strengths.length,
  );
  let consistent = 0;
  for (const item of items)
    for (const dimension of DIMENSIONS) {
      const results = calls.filter((call) => call.id === item.id);
      if (
        results.length === repeats &&
        results.every((call) => call.ok) &&
        new Set(results.map((call) => call.scores?.[dimension])).size === 1
      )
        consistent++;
    }
  metrics.consistency = share(consistent, items.length * DIMENSIONS.length);
  return metrics;
}

export function gateMetrics(
  metrics: Record<string, number>,
  thresholds: z.infer<typeof ThresholdsSchema>,
  subset = false,
): { thresholds: Record<string, number>; failures: string[] } {
  const flat = Object.fromEntries(
    Object.entries(thresholds).flatMap(([key, value]) =>
      typeof value === 'number'
        ? [[key, value]]
        : Object.entries(value).map(([child, n]) => [`${key}.${child}`, n]),
    ),
  );
  const applied: Record<string, number> = {};
  const failures: string[] = [];
  for (const [key, threshold] of Object.entries(flat)) {
    const metric = key === 'latency_ms.p95_max' ? 'latency_ms.p95' : key;
    const value = metrics[metric];
    if (
      value === undefined &&
      subset &&
      (metric.startsWith('monotonic.') || metric === 'injection_resistance')
    ) {
      continue;
    }
    applied[key] = threshold;
    if (
      value === undefined ||
      !Number.isFinite(value) ||
      (key === 'latency_ms.p95_max' ? value > threshold : value < threshold)
    )
      failures.push(metric);
  }
  return { thresholds: applied, failures };
}
