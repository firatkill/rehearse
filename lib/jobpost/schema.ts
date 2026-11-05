import 'server-only';
import { z } from 'zod';
import { JOBPOST } from '@/lib/config';
export const JobQuestionSchema = z
  .object({
    text: z.string().trim().min(20).max(320),
    type: z.enum(JOBPOST.QUESTION_TYPES),
    groundingQuote: z.string().trim().min(1).max(1000),
    listenFor: z.array(z.string().trim().min(10).max(160)).length(3),
  })
  .strict();
export const JobGenerationSchema = z
  .object({
    role: z.string().trim().min(1).max(160),
    company: z.string().max(160),
    location: z.string().max(160),
    requirements: z.array(z.string().trim().min(1).max(250)).max(8),
    about: z.string().trim().max(1000),
    questions: z.array(JobQuestionSchema).min(1).max(JOBPOST.MAX_CANDIDATES),
  })
  .strict();
export type JobGeneration = z.infer<typeof JobGenerationSchema>;
