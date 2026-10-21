import 'server-only';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { HTTP, RATE_LIMIT } from '@/lib/config';
import type { Env } from '@/lib/env';
import { createUpstashAdapter, type UpstashDependencies } from './upstash-adapter';
import { LimiterUnavailableError, type Limiter } from './types';

export function createUpstashLimiter(env: Env, factories?: UpstashDependencies): Limiter {
  if (factories) return createUpstashAdapter(factories);
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new LimiterUnavailableError();
  const redis = new Redis({ url, token, retry: { retries: 1, backoff: () => 50 } });
  const limiters = new Map<string, Ratelimit>();
  return createUpstashAdapter({
    daily: (bucket, limit) => {
      const key = `${bucket}:${limit}`;
      let limiter = limiters.get(key);
      if (!limiter) {
        limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.fixedWindow(limit, '1 d'),
          prefix: `${RATE_LIMIT.PREFIX}:rl:${bucket}`,
          analytics: false,
          timeout: HTTP.LIMITER_TIMEOUT_MS,
        });
        limiters.set(key, limiter);
      }
      return limiter;
    },
    pipeline: () => redis.pipeline(),
  });
}
