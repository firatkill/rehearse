import { afterEach, expect, it, vi } from 'vitest';
import { getEnv, resetEnvForTests } from '@/lib/env';
import { getProvider } from '@/lib/llm';
import * as mock from '@/lib/llm/mock';
import * as live from '@/lib/llm/openai';
import { GET } from '@/app/api/health/route';
import { register } from '@/instrumentation';
import { HealthResponseSchema } from '@/lib/api/contracts';

afterEach(resetEnvForTests);
it.each([undefined, 'live', 'mock', 'invalid'])(
  'TC-159 demo ignores LLM_MODE=%s and constructs no provider',
  async (value) => {
    vi.stubEnv('APP_EDITION', 'demo');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LLM_MODE', value);
    for (const name of [
      'OPENAI_API_KEY',
      'CHAT_MODEL',
      'SESSION_SECRET',
      'IP_HASH_SECRET',
      'NEXT_PUBLIC_SITE_URL',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ])
      vi.stubEnv(name, undefined);
    vi.stubEnv('PRICE_INPUT_PER_MTOK', 'invalid-unused-value');
    vi.stubEnv('RATE_LIMIT_BACKEND', 'invalid-unused-value');
    resetEnvForTests();
    const fake = vi.spyOn(mock, 'createMockProvider');
    const real = vi.spyOn(live, 'createOpenAiProvider');
    const env = getEnv();
    expect(env.APP_EDITION).toBe('demo');
    expect(env.SESSION_SECRET).not.toBe(env.IP_HASH_SECRET);
    expect(() => getProvider()).toThrow(expect.objectContaining({ code: 'DEMO_ONLY' }));
    expect(fake).not.toHaveBeenCalled();
    expect(real).not.toHaveBeenCalled();
    await register();
    const health = GET(new Request('http://localhost/api/health'));
    expect(health.status).toBe(200);
    expect(HealthResponseSchema.parse(await health.json())).toMatchObject({
      edition: 'demo',
      llmMode: 'none',
      rateLimitBackend: 'memory',
    });
  },
);
it('TC-159 full production rejects mock at startup, but full live permits memory', async () => {
  vi.stubEnv('APP_EDITION', 'full');
  vi.stubEnv('NODE_ENV', 'production');
  resetEnvForTests();
  await expect(register()).rejects.toThrow('LLM_MODE');
  vi.stubEnv('LLM_MODE', 'live');
  vi.stubEnv('OPENAI_API_KEY', 'fictional-key');
  vi.stubEnv('CHAT_MODEL', 'fixture');
  vi.stubEnv('PRICE_INPUT_PER_MTOK', '0.1');
  vi.stubEnv('PRICE_OUTPUT_PER_MTOK', '0.5');
  vi.stubEnv('VERCEL_ENV', 'production');
  expect(getEnv()).toMatchObject({
    APP_EDITION: 'full',
    LLM_MODE: 'live',
    RATE_LIMIT_BACKEND: 'memory',
    DATA_DIR: './.data',
    MONTHLY_BUDGET_USD: 5,
  });
  await register();
});
it.each([
  ['APP_EDITION', 'other'],
  ['DATA_DIR', ''],
  ['MONTHLY_BUDGET_USD', '0'],
  ['MONTHLY_BUDGET_USD', '-1'],
  ['MONTHLY_BUDGET_USD', 'Infinity'],
  ['MONTHLY_BUDGET_USD', 'NaN'],
] as const)('TC-159 rejects invalid %s=%s', (name, value) => {
  vi.stubEnv(name, value);
  resetEnvForTests();
  expect(getEnv).toThrow(name);
});
it('TC-159 optional password empty is off and non-empty is retained server-side', () => {
  vi.stubEnv('APP_PASSWORD', '');
  resetEnvForTests();
  expect(getEnv().APP_PASSWORD).toBeUndefined();
  vi.stubEnv('APP_PASSWORD', 'fixture-password');
  resetEnvForTests();
  expect(getEnv().APP_PASSWORD).toBe('fixture-password');
});
it('TC-159 build flag is derived from APP_EDITION, not an independent public override', async () => {
  vi.stubEnv('APP_EDITION', 'demo');
  vi.stubEnv('NEXT_PUBLIC_APP_EDITION', 'full');
  vi.resetModules();
  const config = (await import('@/next.config')).default;
  expect(config.env?.NEXT_PUBLIC_APP_EDITION).toBe('demo');
});
