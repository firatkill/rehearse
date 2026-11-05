import { QuestionSchema } from '@/lib/questions/schema';
import { z } from 'zod';
import { FeedbackSchema } from '@/lib/feedback/schema';
export const DemoFeedbackSchema = z
  .object({
    questionId: z.string(),
    provenance: z.enum(['pending-owner-generation', 'live']),
    model: z.string().nullable(),
    generatedAt: z.iso.datetime().nullable(),
    variants: z
      .array(
        z
          .object({
            level: z.enum(['strong', 'medium', 'weak']),
            answer: z.string().min(1),
            feedback: FeedbackSchema,
          })
          .strict(),
      )
      .length(3),
  })
  .strict();
export const DemoJobSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    company: z.string(),
    role: z.string(),
    text: z.string().max(20000),
    requirements: z.array(z.string()).max(8),
    about: z.string(),
    questions: z
      .array(
        z
          .object({
            ...QuestionSchema.shape,
            id: z.string().regex(/^demo-[a-z0-9-]+$/),
            groundingQuote: z.string().min(1),
          })
          .strict(),
      )
      .length(8),
    provenance: z.enum(['pending-owner-generation', 'live']),
  })
  .strict();
