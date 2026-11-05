import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it('TC-193 the public build flag rejects invalid editions', async () => {
  for (const edition of ['demo', 'full']) {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_EDITION', edition);
    expect((await import('@/lib/edition')).APP_EDITION).toBe(edition);
  }
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_APP_EDITION', 'invalid');
  await expect(import('@/lib/edition')).rejects.toThrow();
});
it('TC-193 client bootstrap disables Zod eval without changing schema validation', async () => {
  vi.resetModules();
  await import('@/instrumentation-client');
  const { z } = await import('zod');
  expect(z.config().jitless).toBe(true);
  const schema = z.object({ count: z.number().int().min(1) }).strict();
  expect(schema.safeParse({ count: 1 }).success).toBe(true);
  expect(schema.safeParse({ count: 0 }).success).toBe(false);
  expect(schema.safeParse({ count: 1, unexpected: true }).success).toBe(false);
});
