/* eslint-disable @typescript-eslint/no-deprecated -- Preserve normative TRD Zod schema syntax. */
import { z } from 'zod';
import {
  ROLES,
  SENIORITIES,
  QUESTION_TYPES,
  ANSWER_MODES,
  TTS,
  SESSION,
  ANSWER,
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

export const SetupSchema = z
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

export const SessionRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    origin: z.enum(['live', 'sample', 'import']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    status: z.enum(['in_progress', 'completed', 'ended_early']),
    setup: SetupSchema,
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

export const AnswerRecordSchema = z
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
