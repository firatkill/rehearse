import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryLimiter } from '@/lib/ratelimit/memory';
import { createUpstashLimiter } from '@/lib/ratelimit/upstash';
import { createUpstashAdapter } from '@/lib/ratelimit/upstash-adapter';
import { LimiterUnavailableError } from '@/lib/ratelimit/types';
import { getLimiter, resetLimiterForTests } from '@/lib/ratelimit';
import { getEnv, resetEnvForTests } from '@/lib/env';
import { HTTP, RATE_LIMIT } from '@/lib/config';
import { fakeUpstash } from '../fixtures/fake-upstash';

afterEach(() => {
  vi.useRealTimers();
  resetLimiterForTests();
  resetEnvForTests();
});
describe.each(['memory', 'upstash'] as const)('TC-023 UT-10 %s contract', (backend) => {
  function fixture() {
    let now = new Date('2026-10-21T12:00:00Z');
    const clock = () => now;
    const limiter =
      backend === 'memory'
        ? createMemoryLimiter(clock)
        : createUpstashLimiter(getEnv(), fakeUpstash(clock));
    return {
      limiter,
      advance: (ms: number) => {
        now = new Date(now.getTime() + ms);
      },
    };
  }
  it('allows up to the daily limit then denies and resets at UTC midnight', async () => {
    const { limiter, advance } = fixture();
    expect(await limiter.consumeDaily('sessions_ip', 'visitor', 2)).toEqual({
      ok: true,
      remaining: 1,
      resetAt: new Date('2026-10-22T00:00:00Z'),
    });
    expect(await limiter.consumeDaily('sessions_ip', 'visitor', 2)).toMatchObject({
      ok: true,
      remaining: 0,
    });
    expect(await limiter.consumeDaily('sessions_ip', 'visitor', 2)).toMatchObject({
      ok: false,
      remaining: 0,
    });
    expect((await limiter.consumeDaily('feedback_ip', 'visitor', 2)).ok).toBe(true);
    expect((await limiter.consumeDaily('sessions_ip', 'other', 2)).ok).toBe(true);
    advance(12 * 60 * 60 * 1000);
    expect(await limiter.consumeDaily('sessions_ip', 'visitor', 2)).toMatchObject({
      ok: true,
      remaining: 1,
    });
  });
  it('keeps session kinds and ids separate, returns token expiry, and does not extend TTL', async () => {
    const { limiter, advance } = fixture();
    const exp = new Date('2026-10-21T14:00:00Z');
    expect(await limiter.consumeSessionCounter('fb', 'session', 2, exp)).toEqual({
      ok: true,
      remaining: 1,
      resetAt: exp,
    });
    advance(60 * 60 * 1000);
    expect((await limiter.consumeSessionCounter('fb', 'session', 2, exp)).remaining).toBe(0);
    expect((await limiter.consumeSessionCounter('fb', 'session', 2, exp)).ok).toBe(false);
    expect((await limiter.consumeSessionCounter('sm', 'session', 2, exp)).ok).toBe(true);
    expect((await limiter.consumeSessionCounter('fb', 'another', 2, exp)).ok).toBe(true);
    advance((RATE_LIMIT.TOKEN_COUNTER_TTL_S - 3600) * 1000);
    expect((await limiter.consumeSessionCounter('fb', 'session', 2, exp)).remaining).toBe(1);
  });
});
it('TC-024 UT-10 fails closed on timeout reasons, network errors, invalid counts and slow pipelines', async () => {
  const fake = fakeUpstash(() => new Date());
  const timeout = createUpstashAdapter({
    ...fake,
    daily: () => ({
      limit: () =>
        Promise.resolve({
          success: true,
          remaining: 0,
          reset: 0,
          pending: Promise.resolve(),
          reason: 'timeout',
        }),
    }),
  });
  await expect(timeout.consumeDaily('llm_global', 'global', 2)).rejects.toBeInstanceOf(
    LimiterUnavailableError,
  );
  const network = createUpstashAdapter({
    ...fake,
    daily: () => ({ limit: () => Promise.reject(new Error('network')) }),
  });
  await expect(network.consumeDaily('llm_global', 'global', 2)).rejects.toBeInstanceOf(
    LimiterUnavailableError,
  );
  const bad = createUpstashAdapter({
    ...fake,
    pipeline: () => {
      const pipe = fake.pipeline();
      pipe.exec = () => Promise.resolve([null, 'invalid']);
      return pipe;
    },
  });
  await expect(bad.consumeSessionCounter('fb', 's', 2, new Date())).rejects.toBeInstanceOf(
    LimiterUnavailableError,
  );
  vi.useFakeTimers();
  const slow = createUpstashAdapter({
    ...fake,
    pipeline: () => {
      const pipe = fake.pipeline();
      pipe.exec = () => new Promise(() => {});
      return pipe;
    },
  });
  const assertion = expect(
    slow.consumeSessionCounter('fb', 's', 2, new Date()),
  ).rejects.toBeInstanceOf(LimiterUnavailableError);
  await vi.advanceTimersByTimeAsync(HTTP.LIMITER_TIMEOUT_MS);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});
it('TC-024 UT-10 supports explicit memory failure and memoizes the configured adapter', async () => {
  await expect(
    createMemoryLimiter(undefined, { failing: true }).consumeDaily('sessions_ip', 'v', 1),
  ).rejects.toBeInstanceOf(LimiterUnavailableError);
  expect(getLimiter()).toBe(getLimiter());
  await expect(getLimiter().consumeDaily('sessions_ip', 'v', 1)).resolves.toMatchObject({
    ok: true,
  });
  resetLimiterForTests();
  resetEnvForTests();
  vi.stubEnv('RATE_LIMIT_BACKEND', 'upstash');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.invalid');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-only-token');
  expect(getLimiter()).toBe(getLimiter()); // Client construction only; no Redis request.
});
