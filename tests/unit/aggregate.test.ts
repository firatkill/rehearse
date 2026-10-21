import { expect, it } from 'vitest';
import { aggregate } from '@/lib/report/aggregate';
import { answer } from '../fixtures/records';
import { feedbackLlm } from '../fixtures/feedback';
function scored(index: number, overall: number) {
  return { ...answer, index, status: 'scored' as const, feedback: { ...feedbackLlm(), overall } };
}
it('TC-081 UT-27 empty and single-answer aggregates retain unscored positions', () => {
  const empty = aggregate([], 3);
  expect(empty).toMatchObject({
    scoredCount: 0,
    overallMean: null,
    best: null,
    lowest: null,
    trend: 'none',
    focus: [],
    delivery: { totalWords: 0, avgWpm: null, totalFillers: 0, longestPauseMs: null },
  });
  expect(empty.perQuestion.map((q) => q.status)).toEqual([
    'not-reached',
    'not-reached',
    'not-reached',
  ]);
  const result = aggregate([scored(1, 2.5), { ...answer, index: 0, status: 'skipped' }], 3);
  expect(result.trend).toBe('single answer');
  expect(result.perQuestion.map((q) => q.status)).toEqual(['skipped', 'scored', 'not-reached']);
  expect(result.focus).toEqual(['structure', 'specificity', 'ownership']);
});
it.each([
  [2, 2.5, 'rising'],
  [3, 2.5, 'falling'],
  [2.5, 2.8, 'flat'],
] as const)('TC-081 UT-27 trend from %s to %s is %s in index order', (first, last, trend) => {
  const result = aggregate([scored(2, last), scored(0, first)], 3);
  expect(result.trend).toBe(trend);
  expect(result.overallMean).toBe(Math.round(((first + last) / 2) * 10) / 10);
});
it('TC-081 UT-27 ties use lowest index, focus uses dimension order, delivery excludes unfinished answers', () => {
  const a = scored(0, 3);
  a.feedback.scores.structure.score = 1;
  a.feedback.scores.clarity.score = 2;
  a.metrics = {
    ...a.metrics,
    words: 100,
    wpm: 120,
    fillers: { total: 2, byPhrase: { um: 2 } },
    longestPauseMs: 3000,
  };
  const saved = {
    ...answer,
    index: 1,
    metrics: {
      ...answer.metrics,
      words: 50,
      wpm: 131,
      fillers: { total: 1, byPhrase: { um: 1 } },
      longestPauseMs: 4000,
    },
  };
  const result = aggregate(
    [
      scored(2, 3),
      saved,
      a,
      { ...answer, index: 3, status: 'draft', metrics: { ...answer.metrics, words: 999 } },
    ],
    4,
  );
  expect(result.best).toEqual({ index: 0, overall: 3 });
  expect(result.lowest).toEqual({ index: 0, overall: 3 });
  expect(result.dimensionMeans.structure).toBe(2.5);
  expect(result.focus).toEqual(['structure', 'clarity', 'specificity']);
  expect(result.delivery).toEqual({
    totalWords: 154,
    avgWpm: 126,
    totalFillers: 3,
    longestPauseMs: 4000,
  });
});
