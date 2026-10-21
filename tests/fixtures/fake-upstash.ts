import { expect } from 'vitest';
import type { UpstashDependencies, CounterPipeline } from '@/lib/ratelimit/upstash-adapter';
import { RATE_LIMIT } from '@/lib/config';

export function fakeUpstash(clock: () => Date): UpstashDependencies {
  const counts = new Map<string, { count: number; expires: number }>();
  return {
    daily: (bucket, limit) => ({
      limit: (id) => {
        const now = clock().getTime();
        const day = Math.floor(now / 86_400_000);
        const key = `${bucket}:${id}:${day}`;
        const count = (counts.get(key)?.count ?? 0) + 1;
        counts.set(key, { count, expires: (day + 1) * 86_400_000 });
        return Promise.resolve({
          success: count <= limit,
          remaining: Math.max(0, limit - count),
          reset: (day + 1) * 86_400_000,
          pending: Promise.resolve(),
        });
      },
    }),
    pipeline: () => {
      let key = '';
      let ttl = 0;
      const pipeline: CounterPipeline = {
        set: (value, zero, options) => {
          expect(zero).toBe(0);
          expect(options).toEqual({ nx: true, ex: RATE_LIMIT.TOKEN_COUNTER_TTL_S });
          expect(value).toMatch(/^rehearse:tok:.+:(fb|sm)$/);
          key = value;
          ttl = options.ex;
          return pipeline;
        },
        incr: (value) => {
          expect(value).toBe(key);
          return pipeline;
        },
        exec: () => {
          const now = clock().getTime();
          const existing = counts.get(key);
          const counter =
            existing && existing.expires > now ? existing : { count: 0, expires: now + ttl * 1000 };
          counter.count++;
          counts.set(key, counter);
          return Promise.resolve([null, counter.count]);
        },
      };
      return pipeline;
    },
  };
}
