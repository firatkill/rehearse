import { z } from 'zod';
import { JOBPOST } from '@/lib/config';
import { InterviewDateSchema } from '@/lib/storage/jobpost-schema';
export const UpcomingItemSchema = z
  .object({
    id: z.uuid(),
    company: z.string().max(160),
    role: z.string().max(160),
    interviewDate: InterviewDateSchema,
    total: z.number().int().min(0).max(JOBPOST.MAX_STORED_QUESTIONS),
    answered: z.number().int().min(0).max(JOBPOST.MAX_STORED_QUESTIONS),
  })
  .strict()
  .refine((item) => item.answered <= item.total);
export const UpcomingResponseSchema = z
  .object({ posts: z.array(UpcomingItemSchema).max(JOBPOST.MAX_POSTS) })
  .strict();
export type UpcomingItem = z.infer<typeof UpcomingItemSchema>;
