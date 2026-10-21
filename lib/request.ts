import 'server-only';
import { HTTP } from '@/lib/config';
import type { Env } from '@/lib/env';
import { AppError, httpStatus, type ErrorCode } from '@/lib/errors';

export async function readJsonBody(
  req: Request,
  maxBytes: number = HTTP.BODY_MAX_BYTES,
): Promise<unknown> {
  if (req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE');
  }
  const declared = Number(req.headers.get('content-length'));
  if (declared > maxBytes) throw new AppError('BODY_TOO_LARGE');
  const body = await req.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new AppError('BODY_TOO_LARGE');
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new AppError('VALIDATION_FAILED');
  }
}

export function checkOrigin(req: Request, env: Env): void {
  const origins = new Set([
    env.NEXT_PUBLIC_SITE_URL,
    ...env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...[env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter((origin): origin is string => Boolean(origin))
      .map((origin) => `https://${origin}`),
  ]);
  const origin = req.headers.get('origin');
  if (origin === null || !origins.has(origin)) throw new AppError('ORIGIN_FORBIDDEN');
}

export function jsonError(
  code: ErrorCode,
  requestId: string,
  extra: { resetAt?: string; sessionCallsRemaining?: number } = {},
): Response {
  return Response.json(
    { error: { code, message: code, requestId, ...extra } },
    {
      status: httpStatus(code),
      headers: { 'x-request-id': requestId, 'Cache-Control': 'no-store' },
    },
  );
}
