import type { z } from 'zod';
import { HTTP } from '@/lib/config';
import {
  ErrorBodySchema,
  StartResponseSchema,
  FeedbackResponseSchema,
  SummaryResponseSchema,
  type ErrorBody,
  type StartRequest,
  type FeedbackRequest,
  type SummaryRequest,
} from './contracts';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'http'; status: number; error: ErrorBody['error'] }
  | { ok: false; kind: 'network' }
  | { ok: false; kind: 'invalid-response' };

async function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
      ...(signal === undefined ? {} : { signal }),
    });
  } catch {
    return { ok: false, kind: 'network' };
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, kind: 'invalid-response' };
  }
  if (!response.ok) {
    const error = ErrorBodySchema.safeParse(data);
    return error.success
      ? { ok: false, kind: 'http', status: response.status, error: error.data.error }
      : { ok: false, kind: 'invalid-response' };
  }
  const parsed = schema.safeParse(data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, kind: 'invalid-response' };
}
export function startSession(body: StartRequest) {
  return post('/api/sessions/start', body, StartResponseSchema);
}
export function requestFeedback(token: string, body: FeedbackRequest, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(HTTP.FEEDBACK_CLIENT_TIMEOUT_MS);
  return post(
    '/api/feedback',
    body,
    FeedbackResponseSchema,
    token,
    signal ? AbortSignal.any([signal, timeout]) : timeout,
  );
}
export function requestSummary(token: string, body: SummaryRequest, signal?: AbortSignal) {
  return post('/api/summary', body, SummaryResponseSchema, token, signal);
}
