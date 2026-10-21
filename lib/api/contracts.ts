/* eslint-disable @typescript-eslint/no-deprecated -- Preserve normative TRD Zod schema syntax. */
import { z } from 'zod';
import {
  ROLES,
  SENIORITIES,
  QUESTION_TYPES,
  ANSWER_MODES,
  SESSION,
  ANSWER,
  DIMENSIONS,
  SUMMARY_LIMITS,
  type Dimension,
} from '@/lib/config';
import { ERROR_CODES } from '@/lib/errors';
import { QuestionSnapshotSchema } from '@/lib/questions/schema';
import { FeedbackSchema } from '@/lib/feedback/schema';
import { SummarySchema } from '@/lib/summary/schema';

export const ErrorBodySchema = z
  .object({
    error: z
      .object({
        code: z.enum(ERROR_CODES),
        message: z.string(), // short English for developers; UI copy comes from the PRD by code
        requestId: z.string(),
        resetAt: z.string().datetime().optional(), // 429 only
        sessionCallsRemaining: z.number().int().nonnegative().optional(), // feedback errors after the session counter was consumed
      })
      .strict(),
  })
  .strict();

export const StartRequestSchema = z
  .object({
    role: z.enum(ROLES),
    seniority: z.enum(SENIORITIES),
    types: z
      .array(z.enum(QUESTION_TYPES))
      .min(1)
      .max(3)
      .refine((t) => new Set(t).size === t.length, 'duplicate type'),
    length: z.union([z.literal(3), z.literal(5)]),
    mode: z.enum(ANSWER_MODES),
    seed: z.string().regex(SESSION.SEED_PATTERN).optional(),
    feedback: z.boolean().default(true),
  })
  .strict();
export const StartResponseSchema = z
  .object({
    sessionId: z.string().uuid(),
    seed: z.string().regex(SESSION.SEED_PATTERN),
    bankVersion: z.string(),
    questions: z.array(QuestionSnapshotSchema).min(3).max(5),
    token: z.string().nullable(),
    tokenExpiresAt: z.string().datetime().nullable(),
    feedback: z
      .object({ enabled: z.boolean(), reason: z.enum(['readonly', 'practice']).nullable() })
      .strict(),
    limits: z
      .object({
        sessionsPerDay: z.number().int(),
        feedbackPerDay: z.number().int(),
        globalDaily: z.number().int(),
      })
      .strict(),
    demoMode: z.enum(['on', 'readonly', 'off']),
  })
  .strict();

export const FeedbackRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    answerIndex: z.number().int().min(0).max(4),
    questionId: z.string().regex(/^(beh|tec|sdl)-\d{3}$/),
    mode: z.enum(ANSWER_MODES),
    transcript: z.string().max(ANSWER.MAX_CHARS),
  })
  .strict();
export const FeedbackResponseSchema = z
  .object({
    feedback: FeedbackSchema, // section 15.2
    meta: z
      .object({
        model: z.string(),
        promptVersion: z.string(),
        bankVersion: z.string(),
        latencyMs: z.number().int(),
        attempts: z.number().int().min(1).max(2),
        usage: z.object({ inputTokens: z.number().int(), outputTokens: z.number().int() }).strict(),
        costUsd: z.number().nonnegative(),
        evidenceRemoved: z.number().int().nonnegative(),
      })
      .strict(),
    remaining: z
      .object({
        session: z.number().int().nonnegative(),
        visitorToday: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

const ScoresSchema = z
  .object(
    Object.fromEntries(DIMENSIONS.map((d) => [d, z.number().int().min(1).max(4)])) as Record<
      Dimension,
      z.ZodNumber
    >,
  )
  .strict();

export const SummaryRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            answerIndex: z.number().int().min(0).max(4),
            questionId: z.string().regex(/^(beh|tec|sdl)-\d{3}$/),
            scores: ScoresSchema,
            improvementPoints: z.array(z.string().max(SUMMARY_LIMITS.INPUT_POINT_MAX_CHARS)).max(3),
            flags: z
              .object({
                off_topic: z.boolean(),
                too_short: z.boolean(),
                injection_suspected: z.boolean(),
              })
              .strict(),
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict();

export const SummaryResponseSchema = z
  .object({
    summary: SummarySchema,
    meta: z
      .object({
        model: z.string(),
        promptVersion: z.string(),
        latencyMs: z.number().int(),
        usage: z.object({ inputTokens: z.number().int(), outputTokens: z.number().int() }).strict(),
        costUsd: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();
export const HealthResponseSchema = z
  .object({
    status: z.literal('ok'),
    version: z.string(),
    commit: z.string(),
    demoMode: z.enum(['on', 'readonly', 'off']),
    llmMode: z.enum(['live', 'mock']),
    rateLimitBackend: z.enum(['upstash', 'memory']),
    promptVersions: z.object({ feedback: z.string(), summary: z.string() }).strict(),
    bankVersion: z.string(),
    time: z.string().datetime(),
  })
  .strict();
export type ErrorBody = z.infer<typeof ErrorBodySchema>;
export type StartRequest = z.infer<typeof StartRequestSchema>;
export type StartResponse = z.infer<typeof StartResponseSchema>;
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;
export type SummaryRequest = z.infer<typeof SummaryRequestSchema>;
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
