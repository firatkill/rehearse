import { describe, expect, it } from 'vitest';
import { getEnv } from '@/lib/env';
import { checkOrigin, jsonError, readJsonBody } from '@/lib/request';
import { HTTP } from '@/lib/config';

function request(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });
}
describe('TC-007 — T-03, TRD §12.1, NFR-13', () => {
  it('accepts JSON with a charset', async () => {
    await expect(
      readJsonBody(request('{"ok":true}', { 'content-type': 'application/json; charset=utf-8' })),
    ).resolves.toEqual({ ok: true });
  });
  it('rejects wrong content type before size or JSON', async () => {
    await expect(
      readJsonBody(
        request('bad', {
          'content-type': 'text/plain',
          'content-length': String(HTTP.BODY_MAX_BYTES + 1),
        }),
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });
  it('checks declared and actual UTF-8 bytes', async () => {
    await expect(
      readJsonBody(request('{}', { 'content-length': String(HTTP.BODY_MAX_BYTES + 1) })),
    ).rejects.toMatchObject({ code: 'BODY_TOO_LARGE' });
    await expect(
      readJsonBody(request(JSON.stringify('é'.repeat(HTTP.BODY_MAX_BYTES / 2)))),
    ).rejects.toMatchObject({ code: 'BODY_TOO_LARGE' });
    await expect(readJsonBody(request('invalid'))).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });
  it('accepts only configured origins including Vercel preview origins', () => {
    const env = {
      ...getEnv(),
      ALLOWED_ORIGINS: ' https://extra.example ',
      VERCEL_URL: 'preview.vercel.app',
      VERCEL_BRANCH_URL: 'branch.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'production.vercel.app',
    };
    for (const origin of [
      env.NEXT_PUBLIC_SITE_URL,
      'https://extra.example',
      'https://preview.vercel.app',
      'https://branch.vercel.app',
      'https://production.vercel.app',
    ]) {
      expect(() => {
        checkOrigin(request('{}', { origin }), env);
      }).not.toThrow();
    }
    expect(() => {
      checkOrigin(request('{}'), env);
    }).toThrow('ORIGIN_FORBIDDEN');
    expect(() => {
      checkOrigin(request('{}', { origin: 'https://evil.example' }), env);
    }).toThrow('ORIGIN_FORBIDDEN');
  });
  it('returns safe error metadata with no-store and request ID', async () => {
    const response = jsonError('GLOBAL_CAP_REACHED', 'request-id', {
      resetAt: '2026-10-22T00:00:00.000Z',
      sessionCallsRemaining: 2,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('request-id');
    expect(await response.json()).toMatchObject({
      error: { code: 'GLOBAL_CAP_REACHED', requestId: 'request-id', sessionCallsRemaining: 2 },
    });
  });
});
