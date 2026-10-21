import { expect, it } from 'vitest';
import { escapeMd, reportMarkdown, reportFilename } from '@/lib/report/markdown';
import { chartSegments } from '@/lib/report/chart';
import { answer, record } from '../fixtures/records';
it('TC-086 UT-28 escapes markup and line-leading list syntax', () => {
  expect(escapeMd('\\`*_[]<>#|~')).toBe('\\\\\\`\\*\\_\\[\\]\\<\\>\\#\\|\\~');
  expect(escapeMd('1. hello')).toBe('1\\. hello');
  for (const marker of ['-', '+', '=']) expect(escapeMd(`${marker} item`)).toBe(`\\${marker} item`);
});
it('TC-086 UT-28 exports saved and skipped answers deterministically with escaped multiline quotes', () => {
  const text = reportMarkdown(record, [
    { ...answer, transcript: '<script>\n1. item | [metric]' },
    { ...answer, index: 1, status: 'skipped' },
  ]);
  expect(text).toContain('# Rehearse session report');
  expect(text).toContain('> \\<script\\>\n> 1\\. item \\| \\[metric\\]');
  expect(text).toContain('Skipped.');
  expect(text).not.toContain('## Summary');
  expect(text).not.toContain('undefined');
  expect(
    reportMarkdown(record, [
      { ...answer, transcript: '<script>\n1. item | [metric]' },
      { ...answer, index: 1, status: 'skipped' },
    ]),
  ).toBe(text);
  expect(reportFilename(record)).toBe('rehearse-2026-10-21-backend.md');
});
it('TC-084 TRD §17.2 plots exact coordinates and breaks lines at unscored questions', () => {
  const points = chartSegments([
    { index: 0, overall: 1, status: 'scored' },
    { index: 1, overall: 4, status: 'scored' },
    { index: 2, overall: null, status: 'skipped' },
    { index: 3, overall: 2.5, status: 'scored' },
  ]);
  expect(points).toEqual([
    [
      { x: 48, y: 168, index: 0 },
      { x: 224, y: 16, index: 1 },
    ],
    [{ x: 576, y: 92, index: 3 }],
  ]);
});
it('TC-086 UT-28 full scored report follows the normative section order and escapes model text', () => {
  const feedback = {
    scores: {
      structure: { score: 3, rationale: '<clear>' },
      specificity: { score: 3, rationale: 'Concrete.' },
      ownership: { score: 3, rationale: 'Owned.' },
      impact: { score: 3, rationale: 'Measured.' },
      relevance: { score: 3, rationale: 'Relevant.' },
      clarity: { score: 3, rationale: 'Clear.' },
    },
    overall: 3,
    strengths: [{ point: 'Good *example*', evidence: 'I built a queue.' }],
    improvements: [
      { point: 'Name a metric.', why: 'It adds context.', rewrite: 'I improved [metric].' },
    ],
    follow_up_question: 'Why that choice?',
    model_answer_outline: ['Context.', 'Action.', 'Result.'],
    flags: { off_topic: false, too_short: false, injection_suspected: false },
  };
  const sample = {
    ...record,
    summary: {
      headline: 'Your [pattern]',
      paragraph: 'You explained the work.',
      focus_notes: [{ dimension: 'structure' as const, note: 'Explain the opening.' }],
      next_practice: 'Try another example.',
      generated_at: record.createdAt,
      model: 'mock',
      prompt_version: 'summary-v1',
    },
  };
  const text = reportMarkdown(sample, [{ ...answer, status: 'scored', feedback }]);
  expect(text).toMatchInlineSnapshot(`
    "# Rehearse session report

    - Date: 2026-10-21
    - Role: Backend, Mid-level
    - Question types: Behavioral
    - Answered: 1 of 3
    - Seed: 1234abcd (question bank 1\\.0.0)
    - Overall: 3.0 / 4

    ## Summary

    Your \\[pattern\\]

    You explained the work.

    ## Focus on these next

    1. **Structure** (3.0 / 4): Explain the opening.
    2. **Specificity** (3.0 / 4): Name the system, the number and the constraint. One concrete detail beats three adjectives.
    3. **Ownership** (3.0 / 4): Say ‘I’ for what you did and ‘the team’ for the rest. The interviewer is hiring you, not the team.

    ## Scores by question

    | Dimension | Q1 | Q2 | Q3 | Average |
    | --------- | --- | --- | --- | ------- |
    | Structure | 3 | — | — | 3.0 |
    | Specificity | 3 | — | — | 3.0 |
    | Ownership | 3 | — | — | 3.0 |
    | Impact | 3 | — | — | 3.0 |
    | Relevance | 3 | — | — | 3.0 |
    | Clarity | 3 | — | — | 3.0 |
    | Overall | 3.0 | — | — | 3.0 |

    ## Delivery

    - Total words: 4
    - Filler words: 0

    ## Next practice

    Try another example.

    ## Answers

    ### Question 1: Tell me about a time you had to deliver something important with less time than you needed. What did you cut, and how did you decide?

    Behavioral · Overall 3.0 / 4

    **Your answer**

    > I built a queue.

    **Scores**

    - Structure: 3 / 4. \\<clear\\>
    - Specificity: 3 / 4. Concrete.
    - Ownership: 3 / 4. Owned.
    - Impact: 3 / 4. Measured.
    - Relevance: 3 / 4. Relevant.
    - Clarity: 3 / 4. Clear.

    **What worked**

    - Good \\*example\\* You said: "I built a queue."

    **What to improve**

    1. Name a metric. It adds context. Try saying: "I improved \\[metric\\]."

    **A likely follow-up question:** Why that choice?

    **Outline of a strong answer**

    - Context.
    - Action.
    - Result.

    ---

    Generated by Rehearse (https://rehearse.firatkil.com). Scores are a coaching aid from a language model, not a prediction of how an interviewer will judge you.
    "
  `);
  expect(text).toContain('## Summary\n\nYour \\[pattern\\]');
  expect(text).toContain('**Structure** (3.0 / 4): Explain the opening.');
  expect(text).toContain('- Structure: 3 / 4. \\<clear\\>');
  expect(text).toContain('- Good \\*example\\* You said: "I built a queue."');
  expect(text).toContain(
    '1. Name a metric. It adds context. Try saying: "I improved \\[metric\\]."',
  );
  expect(text.indexOf('## Summary')).toBeLessThan(text.indexOf('## Focus on these next'));
  expect(text.indexOf('## Next practice')).toBeLessThan(text.indexOf('## Answers'));
});
