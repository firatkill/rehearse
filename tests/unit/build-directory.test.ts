import { expect, it, vi } from 'vitest';
it.each([
  ['full', '', '.next'],
  ['demo', '', '.next-demo'],
  ['demo', 'preview', '.next'],
  ['demo', 'production', '.next'],
])('V-31 build directory for %s on %s is %s', async (edition, vercel, expected) => {
  vi.resetModules();
  vi.stubEnv('APP_EDITION', edition);
  vi.stubEnv('VERCEL_ENV', vercel);
  const { default: config } = await import('../../next.config');
  expect((await config()).distDir).toBe(expected);
});
