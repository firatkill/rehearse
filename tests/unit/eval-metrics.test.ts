import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIMENSIONS } from '@/lib/config';
import { getBank } from '@/lib/questions/bank';
import { validateGolden } from '@/lib/eval/golden-schema';
import {
  computeMetrics,
  containsCanary,
  gateMetrics,
  nearestRank95,
  ThresholdsSchema,
} from '@/lib/eval/metrics';
import type { EvalItemResult } from '@/lib/eval/results-schema';
import thresholdsJson from '@/eval/thresholds.json';
import { feedbackLlm } from '../fixtures/feedback';
import { normalizeFeedback } from '@/lib/feedback/normalize';
const golden = validateGolden(readFileSync('eval/golden.jsonl', 'utf8'), getBank().questions);
const thresholds = ThresholdsSchema.parse(thresholdsJson);
function call(id: string, score: number, repeat = 1): EvalItemResult {
  const item = golden.find((item) => item.id === id)!;
  const { feedback } = normalizeFeedback(feedbackLlm(), { transcript: item.transcript, words: 50 });
  return {
    id,
    repeat,
    ok: true,
    error: null,
    scores: Object.fromEntries(DIMENSIONS.map((d) => [d, score])),
    overall: score,
    flags: { off_topic: false, too_short: false, injection_suspected: false },
    inRange: Object.fromEntries(
      DIMENSIONS.map((d) => [d, score >= item.expected[d][0] && score <= item.expected[d][1]]),
    ),
    canaryLeak: item.canary ? false : null,
    attempts: 1,
    latencyMs: 100,
    usage: { inputTokens: 100, outputTokens: 50 },
    costUsd: 0.001,
    feedback,
  };
}

describe('TC-104 FR-49 UT-37 eval metrics', () => {
  it('counts failed calls in range, JSON and flag denominators', () => {
    const success = call('g-01', 4);
    const failed: EvalItemResult = {
      ...success,
      repeat: 2,
      ok: false,
      scores: null,
      overall: null,
      flags: null,
      inRange: null,
      feedback: null,
      attempts: 2,
    };
    const metrics = computeMetrics(golden.slice(0, 1), [success, failed], 2);
    for (const dimension of DIMENSIONS) expect(metrics[`within_range.${dimension}`]).toBe(0.5);
    expect(metrics).toMatchObject({
      'within_range.overall': 0.5,
      'json_valid.first_attempt': 0.5,
      'json_valid.final': 0.5,
      flag_accuracy: 0.5,
      consistency: 0,
      'tokens.mean_input': 100,
      'tokens.mean_output': 50,
      'cost_usd.total': 0.002,
      'cost_usd.mean_per_call': 0.001,
    });
    const retry = { ...success, repeat: 2, attempts: 2 };
    expect(computeMetrics(golden.slice(0, 1), [success, retry], 2)).toMatchObject({
      'json_valid.first_attempt': 0.5,
      'json_valid.final': 1,
      consistency: 1,
    });
  });

  it('compares strong, average and weak within each repeat, counting failed or absent calls', () => {
    const calls = [
      call('g-01', 4),
      call('g-02', 3),
      call('g-03', 2),
      call('g-01', 2, 2),
      call('g-02', 3, 2),
      call('g-03', 1, 2),
    ];
    expect(computeMetrics(golden.slice(0, 3), calls, 2)).toMatchObject({
      'monotonic.strong_gt_weak': 1,
      'monotonic.chain': 0.5,
    });
    expect(computeMetrics(golden.slice(0, 3), calls.slice(0, 3), 2)).toMatchObject({
      'monotonic.strong_gt_weak': 0.5,
      'monotonic.chain': 0.5,
    });
  });

  it('detects case-insensitive canaries in any nested output string', () => {
    expect(
      containsCanary({ scores: { structure: { rationale: 'A PineApple here' } } }, 'PINEAPPLE'),
    ).toBe(true);
    expect(containsCanary({ outline: ['fine', 'marmalade'] }, 'MARMALADE')).toBe(true);
    expect(containsCanary({ flags: false, empty: null, score: 4, text: 'fine' }, 'PINEAPPLE')).toBe(
      false,
    );
    const item = golden.find((item) => item.id === 'g-23')!;
    const pass = {
      ...call('g-23', 1),
      flags: { off_topic: false, too_short: false, injection_suspected: true },
    };
    expect(computeMetrics([item], [pass], 1).injection_resistance).toBe(1);
    expect(computeMetrics([item], [{ ...pass, canaryLeak: true }], 1).injection_resistance).toBe(0);
    expect(computeMetrics([item], [call('g-23', 4)], 1).injection_resistance).toBe(0);
    expect(computeMetrics([item], [{ ...pass, ok: false }], 1).injection_resistance).toBe(0);
  });

  it('uses only expected flag keys and measures evidence survival', () => {
    const item = golden.find((item) => item.id === 'g-23')!;
    const result = call('g-23', 1);
    result.flags = { off_topic: false, injection_suspected: true, too_short: true };
    result.feedback!.strengths = [
      { point: 'First', evidence: 'A verified quote' },
      { point: 'Second', evidence: null },
    ];
    expect(computeMetrics([item], [result], 1)).toMatchObject({
      flag_accuracy: 1,
      evidence_kept_rate: 0.5,
    });
  });

  it('uses nearest-rank p95, including the boundary and empty partial run', () => {
    expect(nearestRank95([20, ...Array.from({ length: 19 }, (_, i) => i + 1)])).toBe(19);
    expect(nearestRank95([10, 1, 2])).toBe(10);
    expect(nearestRank95([])).toBe(0);
    expect(computeMetrics(golden, [], 2)['json_valid.final']).toBe(0);
  });

  it('applies every full-run gate, retaining exact thresholds and omitting only unavailable subset gates', () => {
    const metrics: Record<string, number> = Object.fromEntries(
      DIMENSIONS.map((d) => [`within_range.${d}`, 1]),
    );
    Object.assign(metrics, {
      'within_range.overall': 1,
      'monotonic.strong_gt_weak': 1,
      'monotonic.chain': 1,
      'json_valid.first_attempt': 1,
      'json_valid.final': 1,
      injection_resistance: 1,
      flag_accuracy: 1,
      'latency_ms.p95': 10000,
    });
    expect(gateMetrics(metrics, thresholds).failures).toEqual([]);
    expect(
      gateMetrics({ ...metrics, 'latency_ms.p95': 10001, 'within_range.overall': 0.84 }, thresholds)
        .failures,
    ).toEqual(['within_range.overall', 'latency_ms.p95']);
    delete metrics.injection_resistance;
    delete metrics['monotonic.chain'];
    delete metrics['monotonic.strong_gt_weak'];
    expect(gateMetrics(metrics, thresholds).failures).toHaveLength(3);
    const subset = gateMetrics(metrics, thresholds, true);
    expect(subset.failures).toEqual([]);
    expect(subset.thresholds).not.toHaveProperty('injection_resistance');
    expect(gateMetrics({ ...metrics, flag_accuracy: NaN }, thresholds, true).failures).toEqual([
      'flag_accuracy',
    ]);
  });
});
