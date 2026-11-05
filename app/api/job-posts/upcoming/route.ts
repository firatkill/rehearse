import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { checkOrigin, readJsonBody, jsonError } from '@/lib/request';
import { JOBPOST } from '@/lib/config';
import { getJobRepository } from '@/lib/jobpost/repository';
import { upcomingPosts } from '@/lib/jobpost/upcoming';
import { createSqliteRepository, getSqliteConnection } from '@/lib/storage/sqlite/repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const env = getEnv();
    if (env.APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
    checkOrigin(request, env);
    z.object({})
      .strict()
      .parse(await readJsonBody(request, JOBPOST.REQUEST_MAX_BYTES));
    return Response.json(
      await upcomingPosts(getJobRepository(), createSqliteRepository(getSqliteConnection())),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return jsonError(
      error instanceof AppError
        ? error.code
        : error instanceof z.ZodError
          ? 'VALIDATION_FAILED'
          : 'INTERNAL_ERROR',
      requestId,
    );
  }
}
