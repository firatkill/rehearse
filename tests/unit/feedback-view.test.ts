import { expect, test } from 'vitest';
import { answerMarks, lengthVerdict, lowestDimension } from '@/lib/report/feedback-view';
import { feedback } from '../fixtures/api';
import { feedbackLlm } from '../fixtures/feedback';
import { normalizeFeedback } from '@/lib/feedback/normalize';

test('TC-148 lowest dimension follows rubric tie order and voice length boundaries are inclusive', () => {
  const tied = {
    ...feedback,
    scores: {
      ...feedback.scores,
      structure: { ...feedback.scores.structure, score: 1 },
      impact: { ...feedback.scores.impact, score: 1 },
    },
  };
  expect(lowestDimension(tied)).toBe('structure');
  expect([null, 0, 59999, 60000, 120000, 120001].map(lengthVerdict)).toEqual([
    'Not available',
    'Too short',
    'Too short',
    'On target',
    'On target',
    'Long',
  ]);
});
test('TC-148 exact model marks and context-sensitive fillers never create invented spans', () => {
  const text = 'I built the queue, um, and it was fine. So people could work.';
  const value = {
    ...feedback,
    strengths: [{ point: 'Specific action', evidence: 'I built the queue' }],
    improvements: [
      {
        point: 'Be specific',
        why: 'Result is vague',
        rewrite: 'I measured [result].',
        dimension: 'impact' as const,
        vague_phrases: ['it was fine', '<script>'],
      },
    ],
  };
  const spans = answerMarks(text, value);
  expect(spans.map((span) => [text.slice(span.start, span.end), span.kind])).toEqual([
    ['I built the queue', 'strong'],
    ['um', 'filler'],
    ['it was fine', 'vague'],
  ]);
  expect(answerMarks('ﬁne um', value)).toEqual([]);
});
test('TC-148 model vague phrases are verified and the lowest dimension must have a rewrite', () => {
  const raw = feedbackLlm();
  raw.improvements[0]!.vague_phrases = [' it was fine ', 'not in answer', 'x'.repeat(201)];
  const result = normalizeFeedback(raw, {
    transcript: 'I delivered the project and it was fine',
    words: 40,
  });
  expect(result.feedback.improvements[0]?.vague_phrases).toEqual(['it was fine']);
  raw.improvements[0]!.dimension = 'impact';
  raw.scores.structure.score = 2;
  expect(() =>
    normalizeFeedback(raw, { transcript: 'I delivered the project', words: 40 }),
  ).toThrow();
});

test('TC-148 equally lowest dimensions accept their matching rewrite without changing scores', () => {
  const raw = feedbackLlm();
  raw.scores.structure.score = 2;
  raw.scores.impact.score = 2;
  raw.improvements[0]!.dimension = 'impact';
  const result = normalizeFeedback(raw, { transcript: 'I delivered the project', words: 40 });
  expect(lowestDimension(result.feedback)).toBe('impact');
  expect(result.feedback.scores.structure.score).toBe(2);
  expect(result.feedback.scores.impact.score).toBe(2);
});
