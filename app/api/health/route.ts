import { randomUUID } from 'node:crypto';
import { getEnv } from '@/lib/env';
import { APP_VERSION } from '@/lib/version';
import { getBank } from '@/lib/questions/bank';
import { FEEDBACK_PROMPT_VERSION, SUMMARY_PROMPT_VERSION } from '@/lib/prompts/version';
import { HealthResponseSchema } from '@/lib/api/contracts';
import { jsonError } from '@/lib/request';
import { logConfigurationFailure } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request): Response {
  const requestId = req.headers.get('x-request-id') ?? randomUUID();
  try {
    const env = getEnv();
    const data = HealthResponseSchema.parse({
      status: 'ok',
      version: APP_VERSION,
      commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      demoMode: env.DEMO_MODE,
      llmMode: env.LLM_MODE,
      rateLimitBackend: env.RATE_LIMIT_BACKEND,
      promptVersions: { feedback: FEEDBACK_PROMPT_VERSION, summary: SUMMARY_PROMPT_VERSION },
      bankVersion: getBank().bankVersion,
      time: new Date().toISOString(),
    });
    return Response.json(data, {
      headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logConfigurationFailure(error);
    return jsonError('INTERNAL_ERROR', requestId);
  }
}
