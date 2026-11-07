import { z } from 'zod';
import { FOLLOW_UP, LANGUAGES } from '@/lib/config';
import { ScoringQuestionIdSchema } from '@/lib/questions/schema';
export const TtsRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('preview'), language: z.enum(LANGUAGES) }).strict(),
  z
    .object({
      kind: z.literal('question'),
      questionId: ScoringQuestionIdSchema,
      language: z.enum(LANGUAGES),
      index: z.number().int().min(0).max(4),
      followUpToken: z.string().max(FOLLOW_UP.TOKEN_MAX_CHARS).optional(),
    })
    .strict(),
]);
export type TtsRequest = z.infer<typeof TtsRequestSchema>;
