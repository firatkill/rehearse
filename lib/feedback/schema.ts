import { z } from 'zod';
import { FEEDBACK_LIMITS } from '@/lib/config';
const DimensionLlm = z.object({ score: z.number(), rationale: z.string() });

export const FeedbackLlmSchema = z.object({
  scores: z.object({
    structure: DimensionLlm,
    specificity: DimensionLlm,
    ownership: DimensionLlm,
    impact: DimensionLlm,
    relevance: DimensionLlm,
    clarity: DimensionLlm,
  }),
  strengths: z.array(z.object({ point: z.string(), evidence: z.string() })),
  improvements: z.array(z.object({ point: z.string(), why: z.string(), rewrite: z.string() })),
  follow_up_question: z.string(),
  model_answer_outline: z.array(z.string()),
  flags: z.object({
    off_topic: z.boolean(),
    too_short: z.boolean(),
    injection_suspected: z.boolean(),
  }),
});
export type FeedbackLlm = z.infer<typeof FeedbackLlmSchema>;
const Score = z.number().int().min(1).max(4);
const DimensionResult = z
  .object({ score: Score, rationale: z.string().min(1).max(FEEDBACK_LIMITS.RATIONALE_MAX_CHARS) })
  .strict();

export const FeedbackSchema = z
  .object({
    scores: z
      .object({
        structure: DimensionResult,
        specificity: DimensionResult,
        ownership: DimensionResult,
        impact: DimensionResult,
        relevance: DimensionResult,
        clarity: DimensionResult,
      })
      .strict(),
    overall: z.number().min(1).max(4),
    strengths: z
      .array(
        z
          .object({
            point: z.string().min(1).max(FEEDBACK_LIMITS.POINT_MAX_CHARS),
            evidence: z.string().max(FEEDBACK_LIMITS.EVIDENCE_MAX_CHARS).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(FEEDBACK_LIMITS.STRENGTHS_MAX),
    improvements: z
      .array(
        z
          .object({
            point: z.string().min(1).max(FEEDBACK_LIMITS.POINT_MAX_CHARS),
            why: z.string().min(1).max(FEEDBACK_LIMITS.WHY_MAX_CHARS),
            rewrite: z.string().min(1).max(FEEDBACK_LIMITS.REWRITE_MAX_CHARS),
          })
          .strict(),
      )
      .min(1)
      .max(FEEDBACK_LIMITS.IMPROVEMENTS_MAX),
    follow_up_question: z.string().min(1).max(FEEDBACK_LIMITS.FOLLOW_UP_MAX_CHARS),
    model_answer_outline: z
      .array(z.string().min(1).max(FEEDBACK_LIMITS.OUTLINE_ITEM_MAX_CHARS))
      .min(FEEDBACK_LIMITS.OUTLINE_MIN)
      .max(FEEDBACK_LIMITS.OUTLINE_MAX),
    flags: z
      .object({ off_topic: z.boolean(), too_short: z.boolean(), injection_suspected: z.boolean() })
      .strict(),
  })
  .strict();
export type Feedback = z.infer<typeof FeedbackSchema>;
