import 'server-only';
import { getEnv } from '@/lib/env';
import { createMemoryLimiter } from './memory';
import { createUpstashLimiter } from './upstash';
import type { Limiter } from './types';
let limiter: Limiter | undefined;
export function getLimiter(): Limiter {
  if (!limiter) {
    const env = getEnv();
    limiter =
      env.RATE_LIMIT_BACKEND === 'memory' ? createMemoryLimiter() : createUpstashLimiter(env);
  }
  return limiter;
}
export function resetLimiterForTests(): void {
  limiter = undefined;
}
