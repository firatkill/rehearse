import 'server-only';
export type DailyBucket = 'sessions_ip' | 'feedback_ip' | 'llm_global';
export type LimitResult = { ok: boolean; remaining: number; resetAt: Date };
export interface Limiter {
  consumeDaily(bucket: DailyBucket, id: string, limit: number): Promise<LimitResult>;
  consumeSessionCounter(
    kind: 'fb' | 'sm',
    sid: string,
    limit: number,
    tokenExpiresAt: Date,
  ): Promise<LimitResult>;
}
export class LimiterUnavailableError extends Error {}
