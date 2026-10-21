import { z } from 'zod';
import { ROLES, SENIORITIES, QUESTION_TYPES, QUESTION_BANK } from '@/lib/config';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const QuestionSchema = z
  .object({
    id: z.string().regex(/^(beh|tec|sdl)-\d{3}$/),
    type: z.enum(QUESTION_TYPES),
    roles: z.array(z.enum(ROLES)).min(1),
    seniority: z.array(z.enum(SENIORITIES)).min(1),
    topic: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    prompt: z
      .string()
      .min(20)
      .max(320)
      .refine((s) => words(s) <= QUESTION_BANK.PROMPT_MAX_WORDS, {
        message: `prompt must have at most ${QUESTION_BANK.PROMPT_MAX_WORDS} words`,
      }),
    follow_up_hints: z.array(z.string().min(10).max(200)).min(2).max(4),
    what_good_looks_like: z.array(z.string().min(10).max(160)).min(3).max(5),
    time_limit_s: z
      .number()
      .int()
      .min(QUESTION_BANK.TIME_LIMIT_MIN_S)
      .max(QUESTION_BANK.TIME_LIMIT_MAX_S),
    status: z.enum(['active', 'retired']),
    added_in: z.string().regex(/^\d+\.\d+\.\d+$/),
  })
  .strict()
  .superRefine((q, ctx) => {
    const prefix = { behavioral: 'beh', 'technical-concepts': 'tec', 'system-design-lite': 'sdl' }[
      q.type
    ];
    if (!q.id.startsWith(`${prefix}-`))
      ctx.addIssue({ code: 'custom', message: `id prefix must be ${prefix}` });
    if (new Set(q.roles).size !== q.roles.length)
      ctx.addIssue({ code: 'custom', message: 'duplicate role' });
    if (new Set(q.seniority).size !== q.seniority.length)
      ctx.addIssue({ code: 'custom', message: 'duplicate seniority' });
  });

export type Question = z.infer<typeof QuestionSchema>;

export const ManifestSchema = z
  .object({
    bankVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    files: z.array(z.string().regex(/^[a-z-]+\.json$/)).min(1),
  })
  .strict();

/** What the browser receives and stores (no status, no added_in). */
export const QuestionSnapshotSchema = z
  .object({
    id: z.string(),
    type: z.enum(QUESTION_TYPES),
    topic: z.string(),
    prompt: z.string(),
    follow_up_hints: z.array(z.string()),
    what_good_looks_like: z.array(z.string()),
    time_limit_s: z.number().int(),
  })
  .strict();
export type QuestionSnapshot = z.infer<typeof QuestionSnapshotSchema>;

export function toSnapshot(q: Question): QuestionSnapshot {
  return {
    id: q.id,
    type: q.type,
    topic: q.topic,
    prompt: q.prompt,
    follow_up_hints: [...q.follow_up_hints],
    what_good_looks_like: [...q.what_good_looks_like],
    time_limit_s: q.time_limit_s,
  };
}
