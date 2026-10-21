import { DIMENSIONS, type Dimension } from '@/lib/config';
import type { AnswerRecord } from '@/lib/storage/schema';
import type { Feedback } from '@/lib/feedback/schema';
export type Aggregates = {
  scoredCount: number;
  dimensionMeans: Record<Dimension, number | null>;
  overallMean: number | null;
  perQuestion: Array<{
    index: number;
    status: 'scored' | 'saved' | 'skipped' | 'not-reached';
    overall: number | null;
  }>;
  best: { index: number; overall: number } | null;
  lowest: { index: number; overall: number } | null;
  trend: 'rising' | 'falling' | 'flat' | 'single answer' | 'none';
  focus: Dimension[];
  delivery: {
    totalWords: number;
    avgWpm: number | null;
    totalFillers: number;
    longestPauseMs: number | null;
  };
};
type AggregateAnswer = Pick<AnswerRecord, 'index' | 'status'> & {
  feedback: Pick<Feedback, 'scores' | 'overall'> | null;
  metrics?: AnswerRecord['metrics'];
};
const mean = (values: number[]) =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
export function aggregate(answers: readonly AggregateAnswer[], questionCount: number): Aggregates {
  const scored = answers
    .filter(
      (a): a is AggregateAnswer & { feedback: NonNullable<AggregateAnswer['feedback']> } =>
        a.feedback !== null,
    )
    .sort((a, b) => a.index - b.index);
  const dimensionMeans = Object.fromEntries(
    DIMENSIONS.map((d) => [d, mean(scored.map((a) => a.feedback.scores[d].score))]),
  ) as Record<Dimension, number | null>;
  const first = scored[0];
  const last = scored.at(-1);
  const delta = first && last ? last.feedback.overall - first.feedback.overall : 0;
  let best: Aggregates['best'] = null;
  let lowest: Aggregates['lowest'] = null;
  for (const a of scored) {
    if (!best || a.feedback.overall > best.overall)
      best = { index: a.index, overall: a.feedback.overall };
    if (!lowest || a.feedback.overall < lowest.overall)
      lowest = { index: a.index, overall: a.feedback.overall };
  }
  const delivered = answers
    .filter((a) => a.status === 'scored' || a.status === 'saved')
    .flatMap((a) => (a.metrics ? [a.metrics] : []));
  const pace = delivered.flatMap((m) => (m.wpm === null ? [] : [m.wpm]));
  const pauses = delivered.flatMap((m) => (m.longestPauseMs === null ? [] : [m.longestPauseMs]));
  return {
    scoredCount: scored.length,
    dimensionMeans,
    overallMean: mean(scored.map((a) => a.feedback.overall)),
    perQuestion: Array.from({ length: questionCount }, (_, index) => {
      const a = answers.find((a) => a.index === index);
      return {
        index,
        status: a?.feedback
          ? 'scored'
          : a?.status === 'saved'
            ? 'saved'
            : a?.status === 'skipped'
              ? 'skipped'
              : 'not-reached',
        overall: a?.feedback?.overall ?? null,
      };
    }),
    best,
    lowest,
    trend:
      scored.length === 0
        ? 'none'
        : scored.length === 1
          ? 'single answer'
          : delta >= 0.5
            ? 'rising'
            : delta <= -0.5
              ? 'falling'
              : 'flat',
    focus: DIMENSIONS.filter((d) => dimensionMeans[d] !== null)
      .sort((a, b) => (dimensionMeans[a] ?? 0) - (dimensionMeans[b] ?? 0))
      .slice(0, 3),
    delivery: {
      totalWords: delivered.reduce((sum, m) => sum + m.words, 0),
      avgWpm: pace.length ? Math.round(pace.reduce((a, b) => a + b, 0) / pace.length) : null,
      totalFillers: delivered.reduce((sum, m) => sum + m.fillers.total, 0),
      longestPauseMs: pauses.length ? Math.max(...pauses) : null,
    },
  };
}
