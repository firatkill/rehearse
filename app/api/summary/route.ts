import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { getEnv } from '@/lib/env';
import { AppError, httpStatus, type ErrorCode } from '@/lib/errors';
import { readJsonBody, checkOrigin, jsonError } from '@/lib/request';
import { SummaryRequestSchema, SummaryResponseSchema } from '@/lib/api/contracts';
import { verifyToken } from '@/lib/session/token';
import { getBank } from '@/lib/questions/bank';
import { getLimiter } from '@/lib/ratelimit';
import { checkSummary } from '@/lib/ratelimit/quotas';
import { LimiterUnavailableError } from '@/lib/ratelimit/types';
import { getProvider } from '@/lib/llm';
import { generateSummary } from '@/lib/summary/generate';
import { SUMMARY_PROMPT_VERSION } from '@/lib/prompts/version';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { getLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-request-id') ?? randomUUID();
  const started = Date.now();
  let attempts = 0;
  let logger: Logger | undefined;
  const fail = (code: ErrorCode, resetAt?: Date) => {
    logger?.warn({
      event: 'summary.failed',
      requestId,
      code,
      attempts,
      latencyMs: Date.now() - started,
      route: '/api/summary',
      status: httpStatus(code),
    });
    return jsonError(code, requestId, {
      ...(resetAt ? { resetAt: resetAt.toISOString() } : {}),
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
    const parsed = SummaryRequestSchema.safeParse(raw);
    if (!parsed.success) return fail('VALIDATION_FAILED');
    const body = parsed.data;
    if (
      body.sessionId !== token.payload.sid ||
      new Set(body.items.map((item) => item.answerIndex)).size !== body.items.length ||
      body.items.some(
        (item) =>
          token.payload.q[item.answerIndex] !== item.questionId ||
          !getBank().questions.some((q) => q.id === item.questionId),
      )
    )
      return fail('TOKEN_SCOPE');
    const quota = await checkSummary(getLimiter(), token.payload, env);
    if (!quota.ok) return fail(quota.code, quota.resetAt);
    const provider = getProvider();
    const result = await generateSummary({
      items: body.items,
      role: token.payload.r,
      seniority: token.payload.s,
      maxOutputTokens: env.MAX_OUTPUT_TOKENS_SUMMARY,
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
    const response = SummaryResponseSchema.parse({
      summary: result.summary,
      meta: {
        model: provider.modelId,
        promptVersion: SUMMARY_PROMPT_VERSION,
        latencyMs: result.latencyMs,
        usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
        costUsd,
      },
    });
    logger.info({
      event: 'summary.done',
      requestId,
      model: provider.modelId,
      promptVersion: SUMMARY_PROMPT_VERSION,
      attempts,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd,
      route: '/api/summary',
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
