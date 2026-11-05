import { DIMENSIONS, PROGRESS, type Dimension } from '@/lib/config';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { aggregate } from './aggregate';
export type ProgressEntry = {
  session: SessionRecord;
  overall: number | null;
  dimensionMeans: Record<Dimension, number | null>;
  answers: number;
  retries: number;
  recordingMs: number;
};
export function progressEntry(session: SessionRecord, answers: AnswerRecord[]): ProgressEntry {
  const values = aggregate(answers, session.questions.length);
  const completed = answers.flatMap((answer) => [
    ...(answer.attemptRecords.length
      ? answer.attemptRecords
      : (answer.status === 'saved' || answer.status === 'scored') && !answer.followUp
        ? [answer]
        : []),
    ...answer.followUpRecords,
  ]);
  return {
    session,
    overall: values.overallMean,
    dimensionMeans: values.dimensionMeans,
    answers: completed.length,
    retries: answers.reduce(
      (sum, answer) => sum + Math.max(0, answer.attemptRecords.length - 1),
      0,
    ),
    recordingMs: completed.reduce((sum, attempt) => sum + (attempt.timing.recordingMs ?? 0), 0),
  };
}
function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
export function progressStats(entries: readonly ProgressEntry[]) {
  const scored = entries
    .filter((entry) => entry.session.status !== 'in_progress' && entry.overall !== null)
    .toSorted(
      (a, b) =>
        a.session.createdAt.localeCompare(b.session.createdAt) ||
        a.session.id.localeCompare(b.session.id),
    );
  const latest = scored.slice(-PROGRESS.COMPARE_SESSIONS);
  const previous = scored.slice(-PROGRESS.COMPARE_SESSIONS * 2, -PROGRESS.COMPARE_SESSIONS);
  const dimensions = DIMENSIONS.map((dimension) => {
    const current = latest.flatMap((entry) =>
      entry.dimensionMeans[dimension] === null ? [] : [entry.dimensionMeans[dimension]],
    );
    const prior = previous.flatMap((entry) =>
      entry.dimensionMeans[dimension] === null ? [] : [entry.dimensionMeans[dimension]],
    );
    const value = mean(current);
    const before = mean(prior);
    return {
      dimension,
      value,
      delta:
        current.length === PROGRESS.COMPARE_SESSIONS &&
        prior.length === PROGRESS.COMPARE_SESSIONS &&
        value !== null &&
        before !== null
          ? value - before
          : null,
      history: scored
        .slice(-PROGRESS.COMPARE_SESSIONS * 2)
        .map((entry) => entry.dimensionMeans[dimension]),
    };
  });
  return {
    points: scored.slice(-PROGRESS.TREND_SESSIONS),
    scoredCount: scored.length,
    latestCount: latest.length,
    dimensions,
    answers: entries.reduce((sum, entry) => sum + entry.answers, 0),
    recordingMinutes: Math.floor(
      entries.reduce((sum, entry) => sum + entry.recordingMs, 0) / 60_000,
    ),
  };
}
