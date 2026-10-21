import { ANSWER, DIMENSIONS, FEEDBACK_LIMITS } from '@/lib/config';
import { InvalidOutputError } from '@/lib/llm/provider';
import { FeedbackLlmSchema, FeedbackSchema, type Feedback, type FeedbackLlm } from './schema';
import { verifyEvidence } from './evidence';
/** Clean model text: strip control characters and simple Markdown markers, collapse whitespace, cap length. */
export function cleanText(s: string, max: number): string {
  let t = s
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > max) {
    const cut = t.slice(0, max - 1);
    const sp = cut.lastIndexOf(' ');
    t = `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
  }
  return t;
}

export function normalizeFeedback(
  raw: FeedbackLlm,
  ctx: { transcript: string; words: number },
): { feedback: Feedback; evidenceRemoved: number } {
  const parsed = FeedbackLlmSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidOutputError();
  const data = parsed.data;
  for (const dimension of DIMENSIONS) {
    const item = data.scores[dimension];
    if (
      !Number.isFinite(item.score) ||
      !Number.isInteger(item.score) ||
      item.score < 1 ||
      item.score > 4
    )
      throw new InvalidOutputError();
    item.rationale = cleanText(item.rationale, FEEDBACK_LIMITS.RATIONALE_MAX_CHARS);
    if (!item.rationale) throw new InvalidOutputError();
  }
  let evidenceRemoved = 0;
  const strengths = data.strengths
    .map((item) => ({ ...item, point: cleanText(item.point, FEEDBACK_LIMITS.POINT_MAX_CHARS) }))
    .filter((item) => item.point)
    .slice(0, FEEDBACK_LIMITS.STRENGTHS_MAX)
    .map((item) => {
      let evidence = cleanText(item.evidence, 10_000);
      for (const [open, close] of [
        ['"', '"'],
        ["'", "'"],
        ['“', '”'],
        ['‘', '’'],
      ] as const) {
        if (evidence.startsWith(open) && evidence.endsWith(close)) {
          evidence = evidence.slice(1, -1).trim();
          break;
        }
      }
      if (!evidence) return { point: item.point, evidence: null };
      if (
        evidence.length > FEEDBACK_LIMITS.EVIDENCE_MAX_CHARS ||
        !verifyEvidence(evidence, ctx.transcript)
      ) {
        evidenceRemoved++;
        return { point: item.point, evidence: null };
      }
      return { point: item.point, evidence };
    });
  const improvements = data.improvements
    .map((item) => ({
      point: cleanText(item.point, FEEDBACK_LIMITS.POINT_MAX_CHARS),
      why: cleanText(item.why, FEEDBACK_LIMITS.WHY_MAX_CHARS),
      rewrite: cleanText(item.rewrite, FEEDBACK_LIMITS.REWRITE_MAX_CHARS),
    }))
    .filter((item) => item.point && item.why && item.rewrite)
    .slice(0, FEEDBACK_LIMITS.IMPROVEMENTS_MAX);
  const flags = { ...data.flags, too_short: ctx.words < ANSWER.SHORT_WORDS };
  if (flags.too_short)
    for (const d of ['structure', 'specificity', 'impact'] as const)
      data.scores[d].score = Math.min(data.scores[d].score, FEEDBACK_LIMITS.CAPPED_MAX_SCORE);
  if (flags.off_topic)
    for (const d of DIMENSIONS)
      data.scores[d].score =
        d === 'relevance' ? 1 : Math.min(data.scores[d].score, FEEDBACK_LIMITS.CAPPED_MAX_SCORE);
  const result = FeedbackSchema.safeParse({
    scores: data.scores,
    overall:
      Math.round(
        (DIMENSIONS.reduce((sum, d) => sum + data.scores[d].score, 0) / DIMENSIONS.length) * 10,
      ) / 10,
    strengths,
    improvements,
    flags,
    follow_up_question: cleanText(data.follow_up_question, FEEDBACK_LIMITS.FOLLOW_UP_MAX_CHARS),
    model_answer_outline: data.model_answer_outline
      .map((item) => cleanText(item, FEEDBACK_LIMITS.OUTLINE_ITEM_MAX_CHARS))
      .filter(Boolean)
      .slice(0, FEEDBACK_LIMITS.OUTLINE_MAX),
  });
  if (!result.success) throw new InvalidOutputError();
  return { feedback: result.data, evidenceRemoved };
}
