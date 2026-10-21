import { NextRequest } from 'next/server';
import { expect, it, vi } from 'vitest';
import { buildCsp, proxy } from '@/proxy';

it('TC-009: NFR-13 / D-23 nonces differ and reach request and response headers', () => {
  vi.stubEnv('NODE_ENV', 'production');
  const a = proxy(new NextRequest('http://localhost:3000'));
  const b = proxy(new NextRequest('http://localhost:3000'));
  const csp = a.headers.get('content-security-policy');
  expect(csp).not.toBe(b.headers.get('content-security-policy'));
  expect(a.headers.get('x-middleware-request-content-security-policy')).toBe(csp);
  expect(csp).toContain(`'nonce-${a.headers.get('x-middleware-request-x-nonce')}'`);
  expect(csp).not.toContain('unsafe-eval');
  expect(csp).not.toContain('upgrade-insecure-requests');
  expect(a.headers.get('permissions-policy')).toContain('microphone=(self)');
  expect(a.headers.get('x-frame-options')).toBe('DENY');
  expect(a.headers.get('strict-transport-security')).toBe('max-age=63072000; includeSubDomains');
  expect(a.headers.get('x-request-id')).not.toBe(b.headers.get('x-request-id'));
});
it('TC-009: D-39 upgrades HTTPS only and unsafe-eval is development-only', () => {
  expect(buildCsp('nonce', { dev: false, https: true })).toContain('upgrade-insecure-requests');
  expect(buildCsp('nonce', { dev: true, https: false })).toContain("'unsafe-eval'");
  vi.stubEnv('NODE_ENV', 'development');
  expect(
    proxy(new NextRequest('http://localhost:3000')).headers.has('strict-transport-security'),
  ).toBe(false);
});
