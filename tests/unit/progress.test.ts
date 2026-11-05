import { expect, test } from 'vitest';
import { entries } from '../fixtures/progress';
import { progressEntry, progressStats } from '@/lib/report/progress';
import { completeAttempt } from '@/lib/storage/attempts';
import { answer, record } from '../fixtures/records';
import { feedback } from '../fixtures/api';

test('TC-152 trend uses last ten scored finished sessions in chronological order; comparison is last three vs previous three', () => {
  const all = entries(12);
  const stats = progressStats([...all].reverse());
  expect(stats.points.map((e) => e.session.id)).toEqual(all.slice(2).map((e) => e.session.id));
  expect(stats.dimensions.every((d) => d.value === 4 && d.delta === 2)).toBe(true);
  expect(stats.answers).toBe(36);
  expect(stats.recordingMinutes).toBe(12);
  expect(progressStats(all.slice(0, 5)).dimensions.every((d) => d.delta === null)).toBe(true);
  const first = all[0]!;
  expect(
    progressStats([
      { ...first, session: { ...first.session, status: 'in_progress' } },
      { ...first, overall: null },
    ]).points,
  ).toEqual([]);
  expect(
    progressStats([{ ...first, session: { ...first.session, status: 'ended_early' } }]).points,
  ).toHaveLength(1);
  expect(
    progressStats([
      { ...first, dimensionMeans: { ...first.dimensionMeans, clarity: null } },
    ]).dimensions.find((d) => d.dimension === 'clarity')?.value,
  ).toBeNull();
  expect(progressStats([]).recordingMinutes).toBe(0);
});
test('TC-152 scores use best original attempt while counts and voice time include completed retries and follow-ups', () => {
  const first = completeAttempt({
    ...answer,
    status: 'scored',
    feedback,
    timing: { ...answer.timing, recordingMs: 60_000 },
  });
  const retried = completeAttempt({ ...first, feedback: { ...feedback, overall: 2 } });
  const followUp = {
    ...retried.attemptRecords[1]!,
    id: 'followup',
    parentAttemptId: first.bestAttemptId!,
    prompt: 'Why?',
    timing: { ...answer.timing, recordingMs: 30_000 },
  };
  const entry = progressEntry(record, [
    { ...retried, followUpRecords: [followUp], status: 'draft', feedback: null },
  ]);
  expect(entry.overall).toBe(feedback.overall);
  expect(entry.answers).toBe(3);
  expect(entry.retries).toBe(1);
  expect(entry.recordingMs).toBe(150_000);
  expect(progressEntry(record, [answer]).answers).toBe(1);
  expect(progressEntry(record, [{ ...answer, status: 'draft' }]).answers).toBe(0);
  expect(progressEntry(record, [answer]).recordingMs).toBe(0);
});
