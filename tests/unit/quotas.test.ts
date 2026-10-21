import { expect, it, vi } from 'vitest';
import { getEnv } from '@/lib/env';
import { createMemoryLimiter } from '@/lib/ratelimit/memory';
import { checkStart, checkFeedback, checkSummary } from '@/lib/ratelimit/quotas';
import { LimiterUnavailableError } from '@/lib/ratelimit/types';

const now = new Date('2026-10-21T12:00:00Z');
const token = { sid: 'session', fb: 3, sm: 2, exp: now.getTime() / 1000 + 7200 };
const env = {
  ...getEnv(),
  RATE_LIMIT_SESSIONS_PER_IP_DAILY: 1,
  RATE_LIMIT_FEEDBACK_PER_IP_DAILY: 10,
  RATE_LIMIT_GLOBAL_LLM_DAILY: 10,
};
it('TC-025 UT-11 consumes the start quota and propagates unavailable failures', async () => {
  const limiter = createMemoryLimiter(() => now);
  expect(await checkStart(limiter, 'visitor', env)).toEqual({ ok: true, remaining: 0 });
  expect(await checkStart(limiter, 'visitor', env)).toMatchObject({
    ok: false,
    code: 'SESSION_QUOTA_EXCEEDED',
    resetAt: new Date('2026-10-22T00:00:00Z'),
  });
  await expect(
    checkStart(
      createMemoryLimiter(() => now, { failing: true }),
      'visitor',
      env,
    ),
  ).rejects.toBeInstanceOf(LimiterUnavailableError);
});
it('TC-025 UT-11 checks session, visitor and global in order and does not refund', async () => {
  const limiter = createMemoryLimiter(() => now);
  const session = vi.spyOn(limiter, 'consumeSessionCounter');
  const daily = vi.spyOn(limiter, 'consumeDaily');
  expect(await checkFeedback(limiter, 'visitor', token, env)).toEqual({ ok: true, remaining: 2 });
  expect(session).toHaveBeenCalledWith('fb', token.sid, token.fb, new Date(token.exp * 1000));
  expect(daily.mock.calls.map((call) => call[0])).toEqual(['feedback_ip', 'llm_global']);
  expect(session.mock.invocationCallOrder[0]!).toBeLessThan(daily.mock.invocationCallOrder[0]!);
  expect(
    await checkFeedback(limiter, 'visitor', token, { ...env, RATE_LIMIT_FEEDBACK_PER_IP_DAILY: 0 }),
  ).toMatchObject({ ok: false, code: 'FEEDBACK_QUOTA_EXCEEDED', remaining: 1 });
  expect(daily).toHaveBeenCalledTimes(3); // Global was not consumed after the visitor denial.
  expect(
    await checkFeedback(limiter, 'visitor', token, { ...env, RATE_LIMIT_GLOBAL_LLM_DAILY: 0 }),
  ).toMatchObject({ ok: false, code: 'GLOBAL_CAP_REACHED', remaining: 0 });
  expect(await checkFeedback(limiter, 'visitor', token, env)).toMatchObject({
    ok: false,
    code: 'SESSION_FEEDBACK_EXHAUSTED',
  });
  expect(daily).toHaveBeenCalledTimes(5); // The session denial stops both daily checks.
});
it('TC-025 UT-11 checks summary session then global, preserving consumed attempts', async () => {
  const limiter = createMemoryLimiter(() => now);
  const session = vi.spyOn(limiter, 'consumeSessionCounter');
  const daily = vi.spyOn(limiter, 'consumeDaily');
  expect(await checkSummary(limiter, token, env)).toEqual({ ok: true, remaining: 1 });
  expect(session.mock.invocationCallOrder[0]!).toBeLessThan(daily.mock.invocationCallOrder[0]!);
  expect(daily).toHaveBeenCalledWith('llm_global', 'global', env.RATE_LIMIT_GLOBAL_LLM_DAILY);
  expect(
    await checkSummary(limiter, token, { ...env, RATE_LIMIT_GLOBAL_LLM_DAILY: 0 }),
  ).toMatchObject({ ok: false, code: 'GLOBAL_CAP_REACHED', remaining: 0 });
  expect(await checkSummary(limiter, token, env)).toMatchObject({
    ok: false,
    code: 'SESSION_SUMMARY_EXHAUSTED',
  });
  expect(daily).toHaveBeenCalledTimes(2);
});
