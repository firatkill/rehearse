import { expect, it } from 'vitest';
import sample from '@/content/sample/session.json';
import transcripts from '@/scripts/sample-transcripts.json';
import { SampleFileSchema, validateSample } from '@/lib/storage/sample-schema';
import { aggregate } from '@/lib/report/aggregate';
import { reportMarkdown } from '@/lib/report/markdown';
import { countWords } from '@/lib/metrics/words';
import { getBank } from '@/lib/questions/bank';
import { selectQuestions } from '@/lib/questions/select';
it('TC-087 UT-40 sample validates, matches seeded selection and produces aggregates/Markdown', () => {
  const parsed = validateSample(sample, true);
  expect(parsed.session).toMatchObject({
    origin: 'sample',
    token: null,
    status: 'completed',
    seed: '5a3c0e11',
    setup: { role: 'full-stack', seniority: 'mid', length: 3 },
  });
  expect(parsed.session.questions.map((q) => q.id)).toEqual(
    selectQuestions(getBank().questions, {
      ...parsed.session.setup,
      seed: parsed.session.seed,
    }).map((q) => q.id),
  );
  const values = aggregate(parsed.answers, 3);
  expect(values.scoredCount).toBe(3);
  expect(values.overallMean).not.toBeNull();
  expect(values.delivery.avgWpm).toBeGreaterThan(0);
  const markdown = reportMarkdown(parsed.session, parsed.answers);
  expect(markdown.startsWith('# Rehearse session report')).toBe(true);
  expect(markdown).toContain('## Summary');
  expect(markdown).toContain('## Answers');
  for (const item of transcripts) {
    expect(countWords(item.transcript)).toBeGreaterThanOrEqual(120);
    expect(countWords(item.transcript)).toBeLessThanOrEqual(300);
  }
});
it('TC-087 UT-40 validation rejects mock provenance unless explicitly allowed', () => {
  const mock = structuredClone(sample);
  mock.answers[0]!.feedbackMeta.model = 'mock';
  expect(() => validateSample(mock)).toThrow(/mock feedback/);
  const live = structuredClone(sample);
  for (const answer of live.answers) answer.feedbackMeta.model = 'live-model';
  expect(() => validateSample(live)).not.toThrow();
});
it('TC-087 UT-40 rejects incomplete, unscored, token-bearing and mismatched samples', () => {
  expect(SampleFileSchema.safeParse({ ...sample, answers: [] }).success).toBe(false);
  expect(
    SampleFileSchema.safeParse({ ...sample, session: { ...sample.session, token: 'not-allowed' } })
      .success,
  ).toBe(false);
  expect(
    SampleFileSchema.safeParse({ ...sample, session: { ...sample.session, summary: null } })
      .success,
  ).toBe(false);
  expect(
    SampleFileSchema.safeParse({
      ...sample,
      answers: sample.answers.map((a, i) =>
        i === 0 ? { ...a, status: 'saved', feedback: null } : a,
      ),
    }).success,
  ).toBe(false);
  expect(
    SampleFileSchema.safeParse({
      ...sample,
      answers: sample.answers.map((a, i) => (i === 0 ? { ...a, questionId: 'beh-999' } : a)),
    }).success,
  ).toBe(false);
});

it('TC-087 TRD §17.5 fictional voice timing has 300 ms spacing and three 2–4 second gaps', () => {
  for (const answer of sample.answers) {
    const gaps = answer.timing.resultOffsetsMs
      .slice(1)
      .map((offset, index) => offset - (answer.timing.resultOffsetsMs[index] ?? 0));
    expect(gaps.filter((gap) => gap !== 300)).toEqual([2000, 3000, 4000]);
  }
});
