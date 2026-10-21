import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { getEnv } from '@/lib/env';
import { AppError, httpStatus, errorLogLevel, type ErrorCode } from '@/lib/errors';
import { readJsonBody, checkOrigin, jsonError } from '@/lib/request';
import { FeedbackRequestSchema, FeedbackResponseSchema } from '@/lib/api/contracts';
import { verifyToken } from '@/lib/session/token';
import { getBank } from '@/lib/questions/bank';
import { getLimiter } from '@/lib/ratelimit';
import { checkFeedback } from '@/lib/ratelimit/quotas';
import { clientIp, visitorId } from '@/lib/ratelimit/visitor';
import { LimiterUnavailableError } from '@/lib/ratelimit/types';
import { getProvider } from '@/lib/llm';
import { generateFeedback } from '@/lib/feedback/generate';
import { FEEDBACK_PROMPT_VERSION } from '@/lib/prompts/version';
import { countWords } from '@/lib/metrics/words';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { getLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-request-id') ?? randomUUID();
  const started = Date.now();
  let attempts = 0;
  let questionId: string | undefined;
  let remaining: number | undefined;
  let logger: Logger | undefined;
  const fail = (code: ErrorCode, resetAt?: Date) => {
    logger?.[errorLogLevel(code)]({
      event: 'feedback.failed',
      requestId,
      questionId,
      code,
      attempts,
      latencyMs: Date.now() - started,
      route: '/api/feedback',
      status: httpStatus(code),
    });
    return jsonError(code, requestId, {
      ...(resetAt ? { resetAt: resetAt.toISOString() } : {}),
      ...(remaining !== undefined ? { sessionCallsRemaining: remaining } : {}),
    });
  };
  try {
    const env = getEnv();
    logger = getLogger();
    const raw = await readJsonBody(req);
    checkOrigin(req, env);
    if (env.DEMO_MODE === 'off') return fail('DEMO_OFF');
    if (env.DEMO_MODE === 'readonly') return fail('DEMO_READONLY');
    const bearer = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
    if (!bearer) return fail('TOKEN_MISSING');
    const token = verifyToken(
      bearer,
      [env.SESSION_SECRET, ...(env.SESSION_SECRET_PREVIOUS ? [env.SESSION_SECRET_PREVIOUS] : [])],
      Math.floor(Date.now() / 1000),
    );
    if (!token.ok) return fail(token.code);
    const parsed = FeedbackRequestSchema.safeParse(raw);
    if (!parsed.success)
      return fail(
        parsed.error.issues.some(
          (issue) => issue.path[0] === 'transcript' && issue.code === 'too_big',
        )
          ? 'TRANSCRIPT_TOO_LONG'
          : 'VALIDATION_FAILED',
      );
    const body = parsed.data;
    if (countWords(body.transcript.trim()) === 0) return fail('TRANSCRIPT_EMPTY');
    if (
      body.sessionId !== token.payload.sid ||
      token.payload.q[body.answerIndex] !== body.questionId
    )
      return fail('TOKEN_SCOPE');
    const question = getBank().questions.find((q) => q.id === body.questionId);
    if (!question) return fail('TOKEN_SCOPE');
    questionId = question.id;
    const quota = await checkFeedback(
      getLimiter(),
      visitorId(clientIp(req.headers), env.IP_HASH_SECRET, new Date()),
      token.payload,
      env,
    );
    if (!quota.ok) {
      if (quota.code !== 'SESSION_FEEDBACK_EXHAUSTED') remaining = quota.remaining;
      return fail(quota.code, quota.resetAt);
    }
    remaining = quota.remaining;
    if (quota.visitorRemaining === undefined) throw new AppError('INTERNAL_ERROR');
    const provider = getProvider();
    const result = await generateFeedback({
      question,
      role: token.payload.r,
      seniority: token.payload.s,
      mode: body.mode,
      transcript: body.transcript,
      maxOutputTokens: env.MAX_OUTPUT_TOKENS_FEEDBACK,
      provider: {
        modelId: provider.modelId,
        generateStructured(args) {
          attempts++;
          return provider.generateStructured(args);
        },
      },
    });
    const costUsd =
      provider.modelId === 'mock'
        ? 0
        : Math.round(
            estimateCostUsd(result.usage, {
              input: env.PRICE_INPUT_PER_MTOK,
              output: env.PRICE_OUTPUT_PER_MTOK,
              cachedInput: env.PRICE_CACHED_INPUT_PER_MTOK,
            }) * 1_000_000,
          ) / 1_000_000;
    const response = FeedbackResponseSchema.parse({
      feedback: result.feedback,
      meta: {
        model: provider.modelId,
        promptVersion: FEEDBACK_PROMPT_VERSION,
        bankVersion: token.payload.b,
        latencyMs: result.latencyMs,
        attempts: result.attempts,
        usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
        costUsd,
        evidenceRemoved: result.evidenceRemoved,
      },
      remaining: { session: remaining, visitorToday: quota.visitorRemaining },
    });
    logger.info({
      event: 'feedback.done',
      requestId,
      questionId,
      mode: body.mode,
      transcriptChars: body.transcript.length,
      words: countWords(body.transcript),
      model: provider.modelId,
      promptVersion: FEEDBACK_PROMPT_VERSION,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd,
      evidenceRemoved: result.evidenceRemoved,
      flags: result.feedback.flags,
      route: '/api/feedback',
      status: 200,
    });
    return Response.json(response, {
      headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return fail(
      error instanceof LimiterUnavailableError
        ? 'LIMITER_UNAVAILABLE'
        : error instanceof AppError
          ? error.code
          : 'INTERNAL_ERROR',
    );
  }
}
