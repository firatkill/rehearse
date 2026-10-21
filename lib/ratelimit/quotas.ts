import 'server-only';
import type { Env } from '@/lib/env';
import type { ErrorCode } from '@/lib/errors';
import type { Limiter, LimitResult } from './types';

export type QuotaResult =
  | { ok: true; remaining: number }
  | { ok: false; code: ErrorCode; resetAt: Date; remaining: number };
type TokenQuota = { sid: string; fb: number; sm: number; exp: number };
function result(value: LimitResult, code: ErrorCode, remaining = value.remaining): QuotaResult {
  return value.ok
    ? { ok: true, remaining }
    : { ok: false, code, resetAt: value.resetAt, remaining };
}
export async function checkStart(
  limiter: Limiter,
  visitor: string,
  env: Env,
): Promise<QuotaResult> {
  return result(
    await limiter.consumeDaily('sessions_ip', visitor, env.RATE_LIMIT_SESSIONS_PER_IP_DAILY),
    'SESSION_QUOTA_EXCEEDED',
  );
}
export async function checkFeedback(
  limiter: Limiter,
  visitor: string,
  token: TokenQuota,
  env: Env,
): Promise<QuotaResult> {
  const session = await limiter.consumeSessionCounter(
    'fb',
    token.sid,
    token.fb,
    new Date(token.exp * 1000),
  );
  if (!session.ok) return result(session, 'SESSION_FEEDBACK_EXHAUSTED');
  // Each earlier step remains consumed if a later check denies; there are no refunds (D-11).
  const visitorLimit = await limiter.consumeDaily(
    'feedback_ip',
    visitor,
    env.RATE_LIMIT_FEEDBACK_PER_IP_DAILY,
  );
  if (!visitorLimit.ok) return result(visitorLimit, 'FEEDBACK_QUOTA_EXCEEDED', session.remaining);
  return result(
    await limiter.consumeDaily('llm_global', 'global', env.RATE_LIMIT_GLOBAL_LLM_DAILY),
    'GLOBAL_CAP_REACHED',
    session.remaining,
  );
}
export async function checkSummary(
  limiter: Limiter,
  token: TokenQuota,
  env: Env,
): Promise<QuotaResult> {
  const session = await limiter.consumeSessionCounter(
    'sm',
    token.sid,
    token.sm,
    new Date(token.exp * 1000),
  );
  if (!session.ok) return result(session, 'SESSION_SUMMARY_EXHAUSTED');
  // A global denial still consumes the session attempt (D-11).
  return result(
    await limiter.consumeDaily('llm_global', 'global', env.RATE_LIMIT_GLOBAL_LLM_DAILY),
    'GLOBAL_CAP_REACHED',
    session.remaining,
  );
}
