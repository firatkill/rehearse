import 'server-only';
import { z } from 'zod';
import { HTTP, RATE_LIMIT } from '@/lib/config';
import { LimiterUnavailableError, type DailyBucket, type Limiter } from './types';

export type DailyResponse = {
  success: boolean;
  remaining: number;
  reset: number;
  reason?: string;
  pending: Promise<unknown>;
};
export type CounterPipeline = {
  set(key: string, value: number, options: { nx: true; ex: number }): CounterPipeline;
  incr(key: string): CounterPipeline;
  exec(): Promise<unknown[]>;
};
export type UpstashDependencies = {
  daily(bucket: DailyBucket, limit: number): { limit(id: string): Promise<DailyResponse> };
  pipeline(): CounterPipeline;
};
const DailySchema = z.object({
  success: z.boolean(),
  remaining: z.number().int().nonnegative(),
  reset: z.number().int().nonnegative(),
});
async function bounded<T>(work: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new LimiterUnavailableError());
        }, HTTP.LIMITER_TIMEOUT_MS);
      }),
    ]);
  } catch {
    throw new LimiterUnavailableError();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
export function createUpstashAdapter(dependencies: UpstashDependencies): Limiter {
  return {
    consumeDaily: (bucket, id, limit) =>
      bounded(async () => {
        const response = await dependencies.daily(bucket, limit).limit(id);
        if (response.reason === 'timeout') throw new LimiterUnavailableError();
        await response.pending;
        const data = DailySchema.parse(response);
        return { ok: data.success, remaining: data.remaining, resetAt: new Date(data.reset) };
      }),
    consumeSessionCounter: (kind, sid, limit, tokenExpiresAt) =>
      bounded(async () => {
        const key = `${RATE_LIMIT.PREFIX}:tok:${sid}:${kind}`;
        const result = await dependencies
          .pipeline()
          .set(key, 0, { nx: true, ex: RATE_LIMIT.TOKEN_COUNTER_TTL_S })
          .incr(key)
          .exec();
        const count = z.number().int().positive().parse(result[1]);
        return {
          ok: count <= limit,
          remaining: Math.max(0, limit - count),
          resetAt: tokenExpiresAt,
        };
      }),
  };
}
