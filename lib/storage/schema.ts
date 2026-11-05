/* eslint-disable @typescript-eslint/no-deprecated -- Preserve normative TRD Zod schema syntax. */
import { z } from 'zod';
import {
  DIMENSIONS,
  ROLES,
  SENIORITIES,
  QUESTION_TYPES,
  ANSWER_MODES,
  TTS,
  SESSION,
  ANSWER,
  FOLLOW_UP,
  FEEDBACK_LIMITS,
} from '@/lib/config';
import { QuestionSnapshotSchema } from '@/lib/questions/schema';
import { FeedbackSchema } from '@/lib/feedback/schema';
import { SummarySchema } from '@/lib/summary/schema';
export const CheckpointPhase = z.enum([
  'intro',
  'asking',
  'thinking',
  'answering',
  'review',
  'submitting',
  'feedback',
  'done',
]);

export const LegacySetupSchema = z
  .object({
    role: z.enum(ROLES),
    seniority: z.enum(SENIORITIES),
    types: z.array(z.enum(QUESTION_TYPES)).min(1),
    length: z.union([z.literal(3), z.literal(5)]),
    mode: z.enum(ANSWER_MODES),
    readAloud: z.boolean(),
    voiceURI: z.string().max(500).nullable(),
    rate: z.number().min(TTS.RATE_MIN).max(TTS.RATE_MAX),
  })
  .strict();

export const SetupSchema = LegacySetupSchema.extend({
  dimension: z.enum(DIMENSIONS).nullable().optional(),
});

export const LegacySessionRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    origin: z.enum(['live', 'sample', 'import']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    status: z.enum(['in_progress', 'completed', 'ended_early']),
    setup: LegacySetupSchema,
    currentMode: z.enum(ANSWER_MODES),
    seed: z.string().regex(SESSION.SEED_PATTERN),
    bankVersion: z.string(),
    questions: z.array(QuestionSnapshotSchema).min(1).max(5),
    feedback: z.object({
      enabled: z.boolean(),
      reason: z.enum(['readonly', 'quota', 'limiter_unavailable', 'practice']).nullable(),
    }),
    token: z.string().max(2_000).nullable(),
    tokenExpiresAt: z.string().datetime().nullable(),
    checkpoint: z.object({
      index: z.number().int().min(0),
      phase: CheckpointPhase,
      at: z.string().datetime(),
    }),
    summary: SummarySchema.nullable(), // section 15.5
    summaryStatus: z.enum(['none', 'done', 'failed', 'unavailable']),
  })
  .strict();

export const TimingSchema = z
  .object({
    recordingMs: z.number().nonnegative().nullable(),
    firstResultOffsetMs: z.number().nonnegative().nullable(),
    resultOffsetsMs: z.array(z.number().nonnegative()).max(4_000),
  })
  .strict();

export const DeliveryMetricsSchema = z
  .object({
    words: z.number().int().nonnegative(),
    speakingMs: z.number().nonnegative().nullable(),
    wpm: z.number().nonnegative().nullable(),
    fillers: z.object({
      total: z.number().int().nonnegative(),
      byPhrase: z.record(z.string(), z.number().int().nonnegative()),
    }),
    longestPauseMs: z.number().nonnegative().nullable(),
    longPauses: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const LegacyAnswerRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    sessionId: z.string().uuid(),
    index: z.number().int().min(0).max(4),
    questionId: z.string(),
    mode: z.enum(ANSWER_MODES),
    status: z.enum(['draft', 'review', 'submitted', 'scored', 'saved', 'skipped']),
    rawTranscript: z.string().max(ANSWER.MAX_CHARS),
    transcript: z.string().max(ANSWER.MAX_CHARS),
    timing: TimingSchema,
    metrics: DeliveryMetricsSchema,
    feedback: FeedbackSchema.nullable(), // section 15.2
    feedbackMeta: z
      .object({
        model: z.string(),
        promptVersion: z.string(),
        latencyMs: z.number(),
        costUsd: z.number(),
        followUpToken: z.string().max(FOLLOW_UP.TOKEN_MAX_CHARS).nullable().optional(),
      })
      .nullable(),
    attempts: z.number().int().nonnegative(),
    notice: z
      .enum(['time_limit', 'char_cap', 'tab_hidden', 'network', 'unexpected_stop', 'restored'])
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const V3SessionRecordSchema = LegacySessionRecordSchema.extend({
  schemaVersion: z.literal(3),
});
export const AttemptRecordSchema = LegacyAnswerRecordSchema.omit({
  schemaVersion: true,
  attempts: true,
  notice: true,
})
  .extend({
    id: z.string(),
    ordinal: z.number().int().positive(),
    status: z.enum(['scored', 'saved']),
  })
  .superRefine((attempt, ctx) => {
    if ((attempt.status === 'scored') !== (attempt.feedback !== null))
      ctx.addIssue({ code: 'custom', message: 'Attempt feedback must match its status.' });
  });
function validateAttempts(
  answer: {
    sessionId: string;
    index: number;
    questionId: string;
    attemptRecords: z.infer<typeof AttemptRecordSchema>[];
    bestAttemptId: string | null;
  },
  ctx: z.RefinementCtx,
) {
  let best: z.infer<typeof AttemptRecordSchema> | undefined;
  for (const [index, attempt] of answer.attemptRecords.entries()) {
    if (
      attempt.ordinal !== index + 1 ||
      attempt.id !== `${answer.sessionId}:${answer.index}:${index + 1}` ||
      attempt.sessionId !== answer.sessionId ||
      attempt.index !== answer.index ||
      attempt.questionId !== answer.questionId
    )
      ctx.addIssue({ code: 'custom', message: 'Attempt ownership or sequence is invalid.' });
    if (attempt.feedback && (!best?.feedback || attempt.feedback.overall > best.feedback.overall))
      best = attempt;
  }
  if (answer.bestAttemptId !== (best?.id ?? null))
    ctx.addIssue({
      code: 'custom',
      message: 'Best attempt must reference the highest scored attempt (earliest tie).',
    });
}
export const V3AnswerRecordSchema = LegacyAnswerRecordSchema.extend({
  schemaVersion: z.literal(3),
  attemptRecords: z.array(AttemptRecordSchema),
  bestAttemptId: z.string().nullable(),
}).superRefine(validateAttempts);
export const FollowUpContextSchema = z
  .object({
    parentAttemptId: z.string(),
    prompt: z.string().min(1).max(FEEDBACK_LIMITS.FOLLOW_UP_MAX_CHARS),
    token: z.string().max(FOLLOW_UP.TOKEN_MAX_CHARS).nullable(),
  })
  .strict();
export const FollowUpRecordSchema = AttemptRecordSchema.safeExtend({
  parentAttemptId: z.string(),
  prompt: z.string().min(1).max(FEEDBACK_LIMITS.FOLLOW_UP_MAX_CHARS),
});
export const V4SessionRecordSchema = V3SessionRecordSchema.extend({ schemaVersion: z.literal(4) });
export const V4AnswerRecordSchema = z
  .object({
    ...V3AnswerRecordSchema.shape,
    schemaVersion: z.literal(4),
    followUp: FollowUpContextSchema.nullable(),
    followUpRecords: z.array(FollowUpRecordSchema),
  })
  .strict()
  .superRefine(validateAttempts)
  .superRefine((answer, ctx) => {
    const validParent = (item: { parentAttemptId: string; prompt: string }) =>
      answer.attemptRecords.some(
        (parent) =>
          parent.id === item.parentAttemptId &&
          parent.status === 'scored' &&
          parent.feedback?.follow_up_question === item.prompt,
      );
    if (answer.followUp && !validParent(answer.followUp))
      ctx.addIssue({ code: 'custom', message: 'Follow-up parent is invalid.' });
    for (const [index, item] of answer.followUpRecords.entries()) {
      if (
        item.ordinal !== index + 1 ||
        item.id !== `${answer.sessionId}:${answer.index}:followup:${index + 1}` ||
        item.sessionId !== answer.sessionId ||
        item.index !== answer.index ||
        item.questionId !== answer.questionId ||
        !validParent(item)
      )
        ctx.addIssue({ code: 'custom', message: 'Follow-up ownership or sequence is invalid.' });
    }
  });
export const SessionRecordSchema = V4SessionRecordSchema.extend({
  schemaVersion: z.literal(5),
  setup: SetupSchema,
});
export const AnswerRecordSchema = z
  .object({ ...V4AnswerRecordSchema.shape, schemaVersion: z.literal(5) })
  .strict()
  .superRefine((answer, ctx) => {
    // V5 changes session setup only; retain every V4 answer ownership/refinement check.
    const previous = V4AnswerRecordSchema.safeParse({ ...answer, schemaVersion: 4 });
    if (!previous.success)
      for (const issue of previous.error.issues)
        ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  });
export type FollowUpRecord = z.infer<typeof FollowUpRecordSchema>;
export type AttemptRecord = z.infer<typeof AttemptRecordSchema>;
export const ExportFileSchema = z.object({
  format: z.literal('rehearse-export'),
  formatVersion: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  appVersion: z.string(),
  sessions: z
    .array(z.object({ session: SessionRecordSchema, answers: z.array(AnswerRecordSchema).max(5) }))
    .max(1_000),
});
export type Setup = z.infer<typeof SetupSchema>;
export type SessionRecord = z.infer<typeof SessionRecordSchema>;
export type Timing = z.infer<typeof TimingSchema>;
export type DeliveryMetrics = z.infer<typeof DeliveryMetricsSchema>;
export type AnswerRecord = z.infer<typeof AnswerRecordSchema>;
export type ExportFile = z.infer<typeof ExportFileSchema>;
