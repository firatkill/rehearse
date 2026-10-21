/* eslint-disable @typescript-eslint/no-deprecated -- Preserve normative TRD Zod schema syntax. */
import { z } from 'zod';
import { SUMMARY_LIMITS, DIMENSIONS } from '@/lib/config';
export const SummaryLlmSchema = z.object({
  headline: z.string(),
  paragraph: z.string(),
  focus_notes: z.array(z.object({ dimension: z.string(), note: z.string() })),
  next_practice: z.string(),
});

export const SummarySchema = z
  .object({
    headline: z.string().min(1).max(SUMMARY_LIMITS.HEADLINE_MAX_CHARS),
    paragraph: z.string().min(1).max(SUMMARY_LIMITS.PARAGRAPH_MAX_CHARS),
    focus_notes: z
      .array(
        z
          .object({
            dimension: z.enum(DIMENSIONS),
            note: z.string().max(SUMMARY_LIMITS.NOTE_MAX_CHARS).nullable(),
          })
          .strict(),
      )
      .max(3),
    next_practice: z.string().min(1).max(SUMMARY_LIMITS.NEXT_PRACTICE_MAX_CHARS),
    generated_at: z.string().datetime(),
    model: z.string(),
    prompt_version: z.string(),
  })
  .strict();
export type Summary = z.infer<typeof SummarySchema>;
