import { describe, expect, it } from 'vitest';
import { DIMENSIONS, FEEDBACK_LIMITS } from '@/lib/config';
import { cleanText, normalizeFeedback } from '@/lib/feedback/normalize';
import { InvalidOutputError } from '@/lib/llm/provider';
import { feedbackLlm } from '../fixtures/feedback';
const ctx = { transcript: 'I delivered the project.', words: 40 };
describe('TC-073 UT-23 feedback normalization', () => {
  it.each([0, 5, 2.5, NaN, Infinity])('rejects invalid score %s', (score) => {
    const raw = feedbackLlm();
    raw.scores.structure.score = score;
    expect(() => normalizeFeedback(raw, ctx)).toThrow(InvalidOutputError);
  });
  it('cleans model markup and control text and truncates with ellipsis', () => {
    expect(cleanText(' **Good**\u0000  `work` ', 40)).toBe('Good work');
    expect(cleanText('1. __A point__', 40)).toBe('A point');
    expect(cleanText('one two three four five six', 20)).toBe('one two three four…');
    expect(cleanText('x'.repeat(25), 20)).toBe('x'.repeat(19) + '…');
  });
  it('caps every textual field and list, drops empty items and rounds overall', () => {
    const raw = feedbackLlm();
    raw.scores.clarity.score = 3;
    raw.scores.structure.rationale = 'r'.repeat(300);
    raw.strengths = [
      { point: ' ', evidence: '' },
      ...Array.from({ length: 5 }, () => ({
        point: 'p'.repeat(200),
        evidence: 'I delivered the project',
      })),
    ];
    raw.improvements = [
      { point: '', why: 'reason', rewrite: 'text' },
      ...Array.from({ length: 5 }, () => ({
        point: 'p'.repeat(200),
        why: 'w'.repeat(300),
        rewrite: 'r'.repeat(500),
      })),
    ];
    raw.follow_up_question = 'f'.repeat(300);
    raw.model_answer_outline = [' ', ...Array.from({ length: 8 }, () => 'o'.repeat(200))];
    const { feedback } = normalizeFeedback(raw, ctx);
    expect(feedback.overall).toBe(3.8);
    expect(feedback.strengths).toHaveLength(3);
    expect(feedback.improvements).toHaveLength(3);
    expect(feedback.model_answer_outline).toHaveLength(6);
    expect(feedback.scores.structure.rationale).toHaveLength(240);
    expect(feedback.strengths[0]?.point).toHaveLength(160);
    expect(feedback.improvements[0]?.why).toHaveLength(200);
    expect(feedback.improvements[0]?.rewrite).toHaveLength(400);
    expect(feedback.follow_up_question).toHaveLength(240);
    expect(feedback.model_answer_outline[0]).toHaveLength(160);
  });
  it.each(['rationale', 'strengths', 'improvements', 'followup', 'outline'] as const)(
    'rejects missing required %s after cleaning',
    (key) => {
      const raw = feedbackLlm();
      if (key === 'rationale') raw.scores.structure.rationale = ' ';
      if (key === 'strengths') raw.strengths = [{ point: ' ', evidence: '' }];
      if (key === 'improvements') raw.improvements[0]!.why = ' ';
      if (key === 'followup') raw.follow_up_question = ' ';
      if (key === 'outline') raw.model_answer_outline = ['one', 'two'];
      expect(() => normalizeFeedback(raw, ctx)).toThrow(InvalidOutputError);
    },
  );
  it('overrides too_short and caps exactly the specified dimensions', () => {
    const raw = feedbackLlm();
    const short = normalizeFeedback(raw, { ...ctx, words: 39 }).feedback;
    expect(short.flags.too_short).toBe(true);
    for (const d of ['structure', 'specificity', 'impact'] as const)
      expect(short.scores[d].score).toBe(2);
    expect(short.scores.ownership.score).toBe(4);
    raw.flags.too_short = true;
    expect(normalizeFeedback(raw, ctx).feedback.flags.too_short).toBe(false);
  });
  it('sets off-topic relevance to one and caps all remaining dimensions', () => {
    const raw = feedbackLlm();
    raw.flags.off_topic = true;
    const out = normalizeFeedback(raw, ctx).feedback;
    for (const d of DIMENSIONS)
      expect(out.scores[d].score).toBe(d === 'relevance' ? 1 : FEEDBACK_LIMITS.CAPPED_MAX_SCORE);
  });
  it('removes unsupported/long evidence, counts removals and distinguishes empty evidence', () => {
    const raw = feedbackLlm();
    raw.strengths = [
      { point: 'empty', evidence: '' },
      { point: 'wrong', evidence: 'words that were never said' },
      { point: 'long', evidence: 'a '.repeat(110) },
    ];
    const result = normalizeFeedback(raw, ctx);
    expect(result.evidenceRemoved).toBe(2);
    expect(result.feedback.strengths.every((s) => s.evidence === null)).toBe(true);
  });
});
