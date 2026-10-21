import { afterEach, vi } from 'vitest';

Object.assign(process.env, {
  LLM_MODE: 'mock',
  RATE_LIMIT_BACKEND: 'memory',
  SESSION_SECRET: 'unit-session-secret-0000000000000000000000',
  IP_HASH_SECRET: 'unit-ip-hash-secret-0000000000000000000000',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
});
const fetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    return Promise.reject(new Error('Tests must not access external services'));
  }
  return fetch(input, init);
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
