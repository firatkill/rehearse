import { z } from 'zod';
import {
  JobPostRecordSchema,
  GeneratedQuestionRecordSchema,
  JobTextSchema,
} from '@/lib/storage/jobpost-schema';
export const JobRequestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('create'), text: JobTextSchema }).strict(),
  z.object({ operation: z.literal('get'), id: z.uuid() }).strict(),
  z.object({ operation: z.literal('updateText'), id: z.uuid(), text: JobTextSchema }).strict(),
  z.object({ operation: z.literal('generate'), id: z.uuid() }).strict(),
  z.object({ operation: z.literal('more'), id: z.uuid() }).strict(),
]);
export const JobResponseSchema = z
  .object({ post: JobPostRecordSchema, questions: z.array(GeneratedQuestionRecordSchema) })
  .strict();
export type JobRequest = z.infer<typeof JobRequestSchema>;
export type JobResponse = z.infer<typeof JobResponseSchema>;
export const JOBPOST_ERROR_COPY = {
  JOBPOST_INVALID:
    'We couldn’t produce enough grounded, distinct questions. Edit the post and try again.',
  JOBPOST_NOT_FOUND: 'That job post could not be found.',
  VALIDATION_FAILED: 'Check the post and try again. Use no more than 20,000 characters.',
  DEMO_ONLY: 'Job-post interviews run in the self-hosted version. Try one of these example posts:',
  PROVIDER_ERROR: 'The AI provider could not complete that request. Try again.',
  PROVIDER_TIMEOUT: 'Generating questions took too long. Try again.',
  NETWORK: 'Couldn’t reach Rehearse. Check your connection and try again.',
} as const;
