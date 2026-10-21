import 'server-only';
import { RATE_LIMIT } from '@/lib/config';
import { utcDate, nextUtcMidnight } from '@/lib/time';
import { LimiterUnavailableError, type Limiter } from './types';

export function createMemoryLimiter(
  clock: () => Date = () => new Date(),
  options: { failing?: boolean } = {},
): Limiter {
  const counters = new Map<string, { count: number; expires: number }>();
  const consume = (key: string, limit: number, expires: number, resetAt: Date) => {
    if (options.failing) throw new LimiterUnavailableError();
    const now = clock().getTime();
    for (const [storedKey, value] of counters) if (value.expires <= now) counters.delete(storedKey);
    const counter = counters.get(key) ?? { count: 0, expires };
    counter.count++;
    counters.set(key, counter);
    return { ok: counter.count <= limit, remaining: Math.max(0, limit - counter.count), resetAt };
  };
  return {
    consumeDaily: (bucket, id, limit) =>
      Promise.resolve().then(() => {
        const now = clock();
        const resetAt = nextUtcMidnight(now);
        return consume(`${bucket}:${id}:${utcDate(now)}`, limit, resetAt.getTime(), resetAt);
      }),
    consumeSessionCounter: (kind, sid, limit, tokenExpiresAt) =>
      Promise.resolve().then(() =>
        consume(
          `token:${sid}:${kind}`,
          limit,
          clock().getTime() + RATE_LIMIT.TOKEN_COUNTER_TTL_S * 1000,
          tokenExpiresAt,
        ),
      ),
  };
}
