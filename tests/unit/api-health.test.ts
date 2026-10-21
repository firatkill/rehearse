import { afterEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/health/route';
import { HealthResponseSchema, ErrorBodySchema } from '@/lib/api/contracts';
import { resetEnvForTests } from '@/lib/env';
import { APP_VERSION } from '@/lib/version';
import * as limiter from '@/lib/ratelimit';
import * as logger from '@/lib/logger';

afterEach(() => {
  resetEnvForTests();
  vi.useRealTimers();
});
it('TC-031 UT-35 returns exact health fields without external calls', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'a1b2c3d4567890');
  vi.stubEnv('DEMO_MODE', 'readonly');
  resetEnvForTests();
  const fetch = vi.spyOn(globalThis, 'fetch');
  const getLimiter = vi.spyOn(limiter, 'getLimiter');
  const res = GET(
    new Request('http://localhost/api/health', { headers: { 'x-request-id': 'health-test' } }),
  );
  expect(res.status).toBe(200);
  expect(res.headers.get('x-request-id')).toBe('health-test');
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(HealthResponseSchema.parse(await res.json())).toEqual({
    status: 'ok',
    version: APP_VERSION,
    commit: 'a1b2c3d',
    demoMode: 'readonly',
    llmMode: 'mock',
    rateLimitBackend: 'memory',
    promptVersions: { feedback: 'feedback-v1', summary: 'summary-v1' },
    bankVersion: '1.0.0',
    time: '2026-10-21T12:00:00.000Z',
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(getLimiter).not.toHaveBeenCalled();
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
  resetEnvForTests();
  expect(
    HealthResponseSchema.parse(await GET(new Request('http://localhost/api/health')).json()).commit,
  ).toBe('dev');
});
it('TC-031 UT-35 returns a safe error when environment validation fails', async () => {
  const log = vi.spyOn(logger, 'logConfigurationFailure').mockImplementation(() => undefined);
  vi.stubEnv('DEMO_MODE', 'invalid-secret-value');
  resetEnvForTests();
  const res = GET(new Request('http://localhost/api/health'));
  expect(res.status).toBe(500);
  expect(log).toHaveBeenCalledOnce();
  const raw: unknown = await res.json();
  expect(ErrorBodySchema.parse(raw).error.code).toBe('INTERNAL_ERROR');
  expect(JSON.stringify(raw)).not.toContain('invalid-secret-value');
  expect(JSON.stringify(raw)).not.toContain('DEMO_MODE');
});

it('TC-031 UT-35 startup logging includes variable names and never raw failure data', () => {
  const output: string[] = [];
  const destination = {
    write: (line: string) => {
      output.push(line);
    },
  };
  logger.logConfigurationFailure(
    new Error('Invalid environment variables: DEMO_MODE, SESSION_SECRET'),
    destination,
  );
  logger.logConfigurationFailure(new Error('secret-value'), destination);
  expect(output[0]).toContain('DEMO_MODE');
  expect(output[0]).toContain('SESSION_SECRET');
  expect(output.join('')).not.toContain('secret-value');
});
