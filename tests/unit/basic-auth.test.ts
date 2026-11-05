import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validBasicAuth } from '@/lib/auth';
import { proxy, config } from '@/proxy';
import { resetEnvForTests } from '@/lib/env';
const auth = (password: string) =>
  `Basic ${Buffer.from(`rehearse:${password}`).toString('base64')}`;
afterEach(() => {
  resetEnvForTests();
});
it('TC-165 D-82 password comparison supports colons and rejects malformed credentials', () => {
  expect(validBasicAuth(auth('test:password'), 'test:password')).toBe(true);
  for (const value of [null, '', 'Bearer token', 'Basic !!!', auth('wrong'), auth('same-length!')])
    expect(validBasicAuth(value, 'test:password')).toBe(false);
  expect(
    validBasicAuth(
      `Basic ${Buffer.from('someone:test:password').toString('base64')}`,
      'test:password',
    ),
  ).toBe(false);
});
it('TC-165 D-82 every full route requires auth, including static and health', () => {
  vi.stubEnv('APP_PASSWORD', 'test:password');
  resetEnvForTests();
  expect(config.matcher).toEqual(['/:path*']);
  for (const path of [
    '/',
    '/setup',
    '/api/health',
    '/api/data',
    '/api/budget',
    '/api/feedback',
    '/api/summary',
    '/api/sessions/start',
    '/_next/static/file.js',
    '/favicon.ico',
  ]) {
    const request = new NextRequest(`http://localhost:3000${path}`);
    expect(proxy(request).status).toBe(401);
    expect(proxy(request).headers.get('www-authenticate')).toContain('Basic');
    expect(
      proxy(new NextRequest(request, { headers: { authorization: auth('test:password') } })).status,
    ).toBe(200);
  }
});
it('TC-165 local full without password and public demo remain available', () => {
  vi.stubEnv('APP_PASSWORD', '');
  resetEnvForTests();
  expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(200);
  vi.stubEnv('APP_PASSWORD', 'secret');
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  expect(proxy(new NextRequest('http://localhost:3000/')).status).toBe(200);
});
