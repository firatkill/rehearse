import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { HTTP } from '@/lib/config';
import { checkOrigin, readJsonBody, jsonError } from '@/lib/request';
import { SessionRecordSchema } from '@/lib/storage/schema';
import { DataRequestSchema } from '@/lib/storage/data-contracts';
import { getSqliteRepository } from '@/lib/storage/sqlite/repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const env = getEnv();
    if (env.APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
    checkOrigin(request, env);
    const input = DataRequestSchema.parse(await readJsonBody(request, HTTP.IMPORT_MAX_BYTES));
    const repo = getSqliteRepository();
    let result: unknown;
    switch (input.operation) {
      case 'exportAll':
        result = await repo.exportAll(input.appVersion);
        break;
      case 'createSession':
        await repo.createSession(input.session);
        result = null;
        break;
      case 'getSession':
        result = await repo.getSession(input.id);
        break;
      case 'updateSession': {
        const current = await repo.getSession(input.id);
        if (!current) throw new AppError('INTERNAL_ERROR');
        const patch = SessionRecordSchema.parse({ ...current, ...input.patch });
        result = await repo.updateSession(input.id, patch);
        break;
      }
      case 'listSessions':
        result = await repo.listSessions();
        break;
      case 'deleteSession':
        await repo.deleteSession(input.id);
        result = null;
        break;
      case 'putAnswer':
        await repo.putAnswer(input.answer);
        result = null;
        break;
      case 'getAnswers':
        result = await repo.getAnswers(input.id);
        break;
      case 'deleteAll':
        await repo.deleteAll();
        result = null;
        break;
      case 'importAll':
        result = await repo.importAll(new File([input.text], 'import.json'));
        break;
      default: {
        const exhaustive: never = input;
        return exhaustive;
      }
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
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
