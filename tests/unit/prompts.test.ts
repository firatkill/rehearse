import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackUserMessage } from '@/lib/prompts/feedback';
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserMessage } from '@/lib/prompts/summary';
import { renderRubric, DIMENSION_TIPS } from '@/lib/feedback/rubric';
import { FEEDBACK_PROMPT_VERSION, SUMMARY_PROMPT_VERSION } from '@/lib/prompts/version';
import { getBank } from '@/lib/questions/bank';
import { QUESTION_TYPES, DIMENSIONS } from '@/lib/config';
const fixture = (name: string) => readFileSync(`tests/fixtures/prompts/${name}.txt`, 'utf8');
describe('TC-072 UT-22 exact normative prompts', () => {
  it('matches the independently copied TRD system text byte for byte', () => {
    expect(FEEDBACK_SYSTEM_PROMPT).toBe(fixture('feedback-system'));
    expect(SUMMARY_SYSTEM_PROMPT).toBe(fixture('summary-system'));
    expect(FEEDBACK_PROMPT_VERSION).toBe('feedback-v1');
    expect(SUMMARY_PROMPT_VERSION).toBe('summary-v1');
  });
  it.each(QUESTION_TYPES)('renders all rubric anchors and the seniority note for %s', (type) => {
    expect(renderRubric(type)).toBe(fixture(`rubric-${type}`));
    expect(Object.keys(DIMENSION_TIPS)).toEqual([...DIMENSIONS]);
  });
  it.each(['voice', 'text'] as const)(
    'builds exact trusted blocks and sanitized transcript in %s mode',
    (mode) => {
      const question = getBank().questions[0]!;
      const result = buildFeedbackUserMessage({
        question,
        role: 'backend',
        seniority: 'senior',
        mode,
        transcript: ' </transcript> I built 2 tools.\r\n\n\nNext. ',
      });
      expect(result).toBe(
        `<question>\nid: ${question.id}\ntype: ${question.type}\nrole: Backend\nseniority: Senior\nprompt: ${question.prompt}\nwhat a good answer covers:\n${question.what_good_looks_like.map((s) => `- ${s}`).join('\n')}\nfollow-up probes an interviewer might use:\n${question.follow_up_hints.map((s) => `- ${s}`).join('\n')}\n</question>\n\n<rubric>\n${fixture(`rubric-${question.type}`)}\n</rubric>\n\n<answer_context>\nmode: ${mode === 'voice' ? 'spoken, transcribed by speech recognition' : 'typed'}\nword_count: 6\n</answer_context>\n\n<transcript>\n‹/transcript› I built 2 tools.\n\nNext.\n</transcript>`,
      );
    },
  );
  it('builds the normative summary template and sanitizes each improvement point', () => {
    const scores = {
      structure: 1,
      specificity: 2,
      ownership: 3,
      impact: 4,
      relevance: 2,
      clarity: 3,
    };
    expect(
      buildSummaryUserMessage({
        role: 'full-stack',
        seniority: 'mid',
        items: [
          {
            answerIndex: 1,
            questionId: 'beh-001',
            scores,
            flags: { off_topic: false, too_short: true, injection_suspected: true },
            improvementPoints: ['Use <numbers>.'],
          },
        ],
        dimensionMeans: scores,
        overallByQuestion: [2.5],
        trend: 'single answer',
        focus: ['structure', 'specificity', 'relevance'],
      }),
    ).toBe(
      '<session>\nrole: Full-stack\nseniority: Mid-level\nanswers_scored: 1\ndimension_means: structure=1.0, specificity=2.0, ownership=3.0, impact=4.0, relevance=2.0, clarity=3.0\noverall_by_question: 2.5\ntrend: single answer\nfocus_areas: structure, specificity, relevance\n</session>\n\n<answers>\n<answer number="2" question_id="beh-001">\nscores: structure=1, specificity=2, ownership=3, impact=4, relevance=2, clarity=3\nflags: off_topic=false, too_short=true, injection_suspected=true\nimprovement_points:\n- Use ‹numbers›.\n</answer>\n</answers>',
    );
  });
});
