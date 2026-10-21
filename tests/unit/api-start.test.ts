import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/sessions/start/route';
import { resetEnvForTests, getEnv } from '@/lib/env';
import * as limiterModule from '@/lib/ratelimit';
import { createMemoryLimiter } from '@/lib/ratelimit/memory';
import { StartResponseSchema, ErrorBodySchema } from '@/lib/api/contracts';
import { verifyToken } from '@/lib/session/token';
import { startBody } from '../fixtures/api';

beforeEach(() => {
  vi.stubEnv('DEMO_MODE', 'on');
  vi.stubEnv('LOG_LEVEL', 'silent');
  resetEnvForTests();
  limiterModule.resetLimiterForTests();
});
afterEach(() => {
  resetEnvForTests();
  limiterModule.resetLimiterForTests();
});
function request(body: unknown = startBody, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/sessions/start', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      'x-real-ip': '10.0.0.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
async function expectError(req: Request, status: number, code: string) {
  const res = await POST(req);
  expect(res.status).toBe(status);
  expect(ErrorBodySchema.parse(await res.json()).error.code).toBe(code);
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('x-request-id')).toBeTruthy();
}
it('TC-029 UT-32 validates media, size, JSON, origin, demo mode and schema in order', async () => {
  await expectError(
    request({}, { 'content-type': 'text/plain', origin: 'https://wrong.invalid' }),
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  );
  await expectError(request({}, { 'content-length': '32769' }), 413, 'BODY_TOO_LARGE');
  await expectError(
    new Request('http://localhost:3000/api/sessions/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }),
    400,
    'VALIDATION_FAILED',
  );
  await expectError(request({}, { origin: 'https://wrong.invalid' }), 403, 'ORIGIN_FORBIDDEN');
  await expectError(request({}), 400, 'VALIDATION_FAILED');
  await expectError(request({ ...startBody, seed: 'invalid' }), 400, 'VALIDATION_FAILED');
  vi.stubEnv('DEMO_MODE', 'off');
  resetEnvForTests();
  await expectError(request({}), 503, 'DEMO_OFF');
});
it('TC-029 UT-32 readonly and practice never call the limiter and return no token', async () => {
  const spy = vi.spyOn(limiterModule, 'getLimiter');
  for (const mode of ['readonly', 'on']) {
    vi.stubEnv('DEMO_MODE', mode);
    resetEnvForTests();
    const res = await POST(request({ ...startBody, feedback: false }));
    expect(res.status).toBe(200);
    const data = StartResponseSchema.parse(await res.json());
    expect(data.feedback).toEqual({
      enabled: false,
      reason: mode === 'readonly' ? 'readonly' : 'practice',
    });
    expect(data.token).toBeNull();
    expect(data.tokenExpiresAt).toBeNull();
  }
  expect(spy).not.toHaveBeenCalled();
});
it('TC-029 UT-32 returns scoped tokens and honours the seed', async () => {
  const res = await POST(request(startBody, { 'x-request-id': 'request-start' }));
  expect(res.status).toBe(200);
  expect(res.headers.get('x-request-id')).toBe('request-start');
  const data = StartResponseSchema.parse(await res.json());
  expect(data.seed).toBe(startBody.seed);
  expect(data.questions).toHaveLength(3);
  expect(data.feedback).toEqual({ enabled: true, reason: null });
  const checked = verifyToken(
    data.token!,
    [getEnv().SESSION_SECRET],
    Math.floor(Date.now() / 1000),
  );
  expect(checked.ok).toBe(true);
  if (!checked.ok) throw new Error('expected valid token');
  expect(checked.payload).toMatchObject({
    fb: 5,
    sm: 2,
    q: data.questions.map((q) => q.id),
    r: 'backend',
    s: 'mid',
    b: data.bankVersion,
    sid: data.sessionId,
  });
  expect(checked.payload.exp - checked.payload.iat).toBe(7200);
  expect(data.tokenExpiresAt).toBe(new Date(checked.payload.exp * 1000).toISOString());
  const again = StartResponseSchema.parse(await (await POST(request())).json());
  expect(again.questions).toEqual(data.questions);
  expect(again.sessionId).not.toBe(data.sessionId);
  const unseeded = { ...startBody };
  delete unseeded.seed;
  expect(StartResponseSchema.parse(await (await POST(request(unseeded))).json()).seed).toMatch(
    /^[a-f0-9]{8}$/,
  );
});
it('TC-030 UT-32 denies the fourth session and fails closed on limiter errors', async () => {
  for (let i = 0; i < 3; i++) expect((await POST(request())).status).toBe(200);
  const denied = await POST(request());
  expect(denied.status).toBe(429);
  const error = ErrorBodySchema.parse(await denied.json()).error;
  expect(error.code).toBe('SESSION_QUOTA_EXCEEDED');
  expect(typeof error.resetAt).toBe('string');
  vi.spyOn(limiterModule, 'getLimiter').mockReturnValue(
    createMemoryLimiter(() => new Date(), { failing: true }),
  );
  await expectError(request(), 503, 'LIMITER_UNAVAILABLE');
});
