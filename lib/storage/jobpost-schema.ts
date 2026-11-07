import { z } from 'zod';
import { StoredJobAnalysisSchema, groundedAnalysis } from './job-analysis';
import { JOBPOST, ROLES, LANGUAGES } from '@/lib/config';
export const GeneratedQuestionIdSchema = z
  .string()
  .regex(/^gen-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const JobTextSchema = z.string().trim().min(1).max(JOBPOST.MAX_CHARS);
export const InterviewDateSchema = z.iso.date();
export const LegacyJobPostRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    text: JobTextSchema,
    sourceUrl: z.url().nullable(),
    status: z.enum(['draft', 'ready']),
    role: z.string().max(160),
    company: z.string().max(160),
    location: z.string().max(160),
    requirements: z.array(z.string().trim().min(1).max(250)).max(8),
    about: z.string().max(1000),
    practiceRole: z.enum(ROLES),
  })
  .strict();
export const V2JobPostRecordSchema = LegacyJobPostRecordSchema.extend({
  schemaVersion: z.literal(2),
  interviewDate: InterviewDateSchema.nullable(),
});
export const V3JobPostRecordSchema = V2JobPostRecordSchema.extend({
  schemaVersion: z.literal(3),
  language: z.enum(LANGUAGES),
});
export const JobPostRecordSchema = V3JobPostRecordSchema.extend({
  schemaVersion: z.literal(4),
  analysis: StoredJobAnalysisSchema.nullable(),
}).superRefine((post, ctx) => {
  if (post.analysis && !groundedAnalysis(post.analysis, post.text))
    ctx.addIssue({
      code: 'custom',
      path: ['analysis'],
      message: 'Analysis quotes must match the post',
    });
});
export function migrateJobRecord(input: unknown) {
  const current = JobPostRecordSchema.safeParse(input);
  if (current.success) return current.data;
  const v3 = V3JobPostRecordSchema.safeParse(input);
  if (v3.success)
    return JobPostRecordSchema.parse({ ...v3.data, schemaVersion: 4, analysis: null });
  const v2 = V2JobPostRecordSchema.safeParse(input);
  if (v2.success)
    return JobPostRecordSchema.parse({
      ...v2.data,
      schemaVersion: 4,
      analysis: null,
      language: 'en',
    });
  const legacy = LegacyJobPostRecordSchema.safeParse(input);
  return legacy.success
    ? JobPostRecordSchema.parse({
        ...legacy.data,
        schemaVersion: 4,
        analysis: null,
        interviewDate: null,
        language: 'en',
      })
    : null;
}
export const GeneratedQuestionRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: GeneratedQuestionIdSchema,
    jobPostId: z.uuid(),
    text: z.string().trim().min(20).max(320),
    type: z.enum(JOBPOST.QUESTION_TYPES),
    groundingQuote: z.string().trim().min(1).max(1000),
    listenFor: z.array(z.string().trim().min(10).max(160)).length(3),
    createdAt: z.iso.datetime(),
    model: z.string().trim().min(1).max(160),
    promptVersion: z.string().trim().min(1),
    origin: z.enum(['generated', 'import']),
  })
  .strict();
export const JobDataSchema = z.object({
  jobPosts: z.array(JobPostRecordSchema).max(JOBPOST.MAX_POSTS),
  generatedQuestions: z
    .array(GeneratedQuestionRecordSchema)
    .max(JOBPOST.MAX_POSTS * JOBPOST.MAX_STORED_QUESTIONS),
});
export type JobPostRecord = z.infer<typeof JobPostRecordSchema>;
export type GeneratedQuestionRecord = z.infer<typeof GeneratedQuestionRecordSchema>;
export type JobData = z.infer<typeof JobDataSchema>;

export function jobFeedbackType(type: GeneratedQuestionRecord['type']) {
  return type === 'technical'
    ? ('technical-concepts' as const)
    : type === 'system-design'
      ? ('system-design-lite' as const)
      : ('behavioral' as const);
}
