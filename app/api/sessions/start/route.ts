import { getJobRepository } from '@/lib/jobpost/repository';
import { generatedToQuestion } from '@/lib/jobpost/question';
import { demoFeedback, demoJobs } from '@/lib/demo/content';
import { randomUUID } from 'node:crypto';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { SESSION, LANGUAGE_FEATURES } from '@/lib/config';
import { readJsonBody, checkOrigin, jsonError } from '@/lib/request';
import { StartRequestSchema, StartResponseSchema } from '@/lib/api/contracts';
import { getInterviewBank as getBank } from '@/lib/demo/catalog';
import { selectQuestions, newSeed } from '@/lib/questions/select';
import { toSnapshot } from '@/lib/questions/schema';
import { getLimiter } from '@/lib/ratelimit';
import { LimiterUnavailableError } from '@/lib/ratelimit/types';
import { checkStart } from '@/lib/ratelimit/quotas';
import { clientIp, visitorId } from '@/lib/ratelimit/visitor';
import { signToken } from '@/lib/session/token';
import { getLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-request-id') ?? randomUUID();
  const started = Date.now();
  try {
    const raw = await readJsonBody(req);
    const env = getEnv();
    checkOrigin(req, env);
    if (env.DEMO_MODE === 'off') return jsonError('DEMO_OFF', requestId);
    const parsed = StartRequestSchema.safeParse(raw);
    if (!parsed.success) return jsonError('VALIDATION_FAILED', requestId);
    const body = parsed.data;
    const language = body.language ?? 'en';
    if (language === 'tr' && env.APP_EDITION === 'demo') return jsonError('DEMO_ONLY', requestId);
    if (language === 'tr' && !LANGUAGE_FEATURES.turkishSessions)
      return jsonError('VALIDATION_FAILED', requestId);
    const bank = getBank(language);
    const seed = body.seed ?? newSeed();
    const demoJob =
      body.demoJob === undefined ? undefined : demoJobs.find((job) => job.slug === body.demoJob);
    if (body.demoJob !== undefined && (env.APP_EDITION !== 'demo' || !demoJob))
      return jsonError('VALIDATION_FAILED', requestId);
    if (body.jobPostId && env.APP_EDITION !== 'full') return jsonError('DEMO_ONLY', requestId);
    const jobRepo = body.jobPostId ? getJobRepository() : null;
    const job = body.jobPostId ? jobRepo?.get(body.jobPostId) : null;
    if (body.jobPostId && !job) return jsonError('JOBPOST_NOT_FOUND', requestId);
    if (job && job.language !== language) return jsonError('TOKEN_SCOPE', requestId);
    const selected =
      job && jobRepo ? (body.questionIds ?? []).map((id) => jobRepo.generatedQuestion(id)) : [];
    if (job && selected.some((question) => !question || question.jobPostId !== job.id))
      return jsonError('TOKEN_SCOPE', requestId);
    const scoringRole = job?.practiceRole ?? body.role;
    const questions = job
      ? selected.flatMap((question) =>
          question ? [toSnapshot(generatedToQuestion(question, job))] : [],
        )
      : selectQuestions(
          demoJob
            ? demoJob.questions
            : env.APP_EDITION === 'demo'
              ? bank.questions.filter((q) => demoFeedback.some((item) => item.questionId === q.id))
              : bank.questions,
          {
            ...body,
            seed,
            ...(env.APP_EDITION === 'demo' ? { dimension: null } : {}),
            ...(demoJob ? { types: ['behavioral'] as const } : {}),
          },
        ).map(toSnapshot);
    const sessionId = randomUUID();
    const reason = env.DEMO_MODE === 'readonly' ? 'readonly' : body.feedback ? null : 'practice';
    let token: string | null = null;
    let tokenExpiresAt: string | null = null;
    if (reason === null) {
      const quota =
        env.APP_EDITION === 'demo'
          ? { ok: true as const }
          : await checkStart(
              getLimiter(),
              visitorId(clientIp(req.headers), env.IP_HASH_SECRET, new Date()),
              env,
            );
      if (!quota.ok)
        return jsonError(quota.code, requestId, { resetAt: quota.resetAt.toISOString() });
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + SESSION.TOKEN_TTL_S;
      token = signToken(
        {
          v: 1,
          l: language,
          sid: sessionId,
          iat,
          exp,
          fb: body.length + SESSION.FEEDBACK_RETRY_ALLOWANCE,
          sm: SESSION.SUMMARY_CALLS_PER_SESSION,
          q: questions.map((q) => q.id),
          r: scoringRole,
          s: body.seniority,
          b: bank.bankVersion,
        },
        env.SESSION_SECRET,
      );
      tokenExpiresAt = new Date(exp * 1000).toISOString();
    }
    const response = StartResponseSchema.parse({
      sessionId,
      seed,
      bankVersion: bank.bankVersion,
      questions,
      token,
      tokenExpiresAt,
      feedback: { enabled: reason === null, reason },
      limits: {
        sessionsPerDay: env.RATE_LIMIT_SESSIONS_PER_IP_DAILY,
        feedbackPerDay: env.RATE_LIMIT_FEEDBACK_PER_IP_DAILY,
        globalDaily: env.RATE_LIMIT_GLOBAL_LLM_DAILY,
      },
      demoMode: env.DEMO_MODE,
    });
    getLogger().info({
      event: 'session.start',
      requestId,
      length: body.length,
      types: body.types,
      mode: body.mode,
      feedback: reason === null,
      seedProvided: body.seed !== undefined,
      latencyMs: Date.now() - started,
    });
    return Response.json(response, {
      headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return jsonError(
      error instanceof LimiterUnavailableError
        ? 'LIMITER_UNAVAILABLE'
        : error instanceof AppError
          ? error.code
          : 'INTERNAL_ERROR',
      requestId,
    );
  }
}
