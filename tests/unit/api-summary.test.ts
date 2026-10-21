import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/summary/route';
import { getEnv, resetEnvForTests } from '@/lib/env';
import * as limiterModule from '@/lib/ratelimit';
import * as loggerModule from '@/lib/logger';
import * as providerModule from '@/lib/llm';
import { createMemoryLimiter } from '@/lib/ratelimit/memory';
import { signToken, type TokenPayload } from '@/lib/session/token';
import { getBank } from '@/lib/questions/bank';
import { SummaryResponseSchema, ErrorBodySchema } from '@/lib/api/contracts';
import { sessionId } from '../fixtures/api';
const logs: string[] = [];
function token(overrides: Partial<TokenPayload> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return signToken(
    {
      v: 1,
      sid: sessionId,
      iat: now,
      exp: now + 7200,
      fb: 5,
      sm: 2,
      q: getBank()
        .questions.slice(0, 3)
        .map((q) => q.id),
      r: 'backend',
      s: 'mid',
      b: getBank().bankVersion,
      ...overrides,
    },
    getEnv().SESSION_SECRET,
  );
}
const body = () => ({
  sessionId,
  items: [
    {
      answerIndex: 0,
      questionId: getBank().questions[0]!.id,
      scores: { structure: 1, specificity: 2, ownership: 3, impact: 4, relevance: 4, clarity: 4 },
      improvementPoints: ['Private improvement point'],
      flags: { off_topic: false, too_short: false, injection_suspected: false },
    },
  ],
});
function request(data: unknown = body(), headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/summary', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      authorization: `Bearer ${token()}`,
      ...headers,
    },
    body: JSON.stringify(data),
  });
}
async function error(req: Request, status: number, code: string) {
  const res = await POST(req);
  expect(res.status).toBe(status);
  expect(ErrorBodySchema.parse(await res.json()).error.code).toBe(code);
}
beforeEach(() => {
  vi.stubEnv('DEMO_MODE', 'on');
  vi.stubEnv('LLM_MODE', 'mock');
  vi.stubEnv('RATE_LIMIT_BACKEND', 'memory');
  vi.stubEnv('MOCK_LLM_DELAY_MS', '0');
  vi.stubEnv('LOG_LEVEL', 'info');
  resetEnvForTests();
  limiterModule.resetLimiterForTests();
  logs.length = 0;
  vi.spyOn(loggerModule, 'getLogger').mockImplementation(() =>
    loggerModule.createLogger(getEnv(), {
      write(chunk) {
        logs.push(chunk);
      },
    }),
  );
});
afterEach(() => {
  resetEnvForTests();
  limiterModule.resetLimiterForTests();
});
it('TC-083 UT-34 validates media, origin, demo and token before item validation', async () => {
  await error(
    request({}, { 'content-type': 'text/plain', authorization: '' }),
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  );
  await error(
    request({}, { origin: 'https://wrong.invalid', authorization: '' }),
    403,
    'ORIGIN_FORBIDDEN',
  );
  vi.stubEnv('DEMO_MODE', 'readonly');
  resetEnvForTests();
  await error(request({}, { authorization: '' }), 503, 'DEMO_READONLY');
  vi.stubEnv('DEMO_MODE', 'on');
  resetEnvForTests();
  await error(request({}, { authorization: '' }), 401, 'TOKEN_MISSING');
  await error(request({}, { authorization: `Bearer ${token({ exp: 1 })}` }), 401, 'TOKEN_EXPIRED');
  await error(request({}), 400, 'VALIDATION_FAILED');
});
it('TC-083 UT-34 rejects duplicate indices, foreign questions, wrong session and client aggregates', async () => {
  const data = body();
  await error(request({ ...data, items: [...data.items, ...data.items] }), 403, 'TOKEN_SCOPE');
  await error(
    request({ ...data, items: [{ ...data.items[0], questionId: 'beh-999' }] }),
    403,
    'TOKEN_SCOPE',
  );
  await error(request({ ...data, sessionId: crypto.randomUUID() }), 403, 'TOKEN_SCOPE');
  await error(request({ ...data, means: { structure: 4 } }), 400, 'VALIDATION_FAILED');
});
it('TC-083 UT-34 recomputes summary focus, returns metadata and logs no private content', async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  const result = SummaryResponseSchema.parse(await response.json());
  expect(result.summary.focus_notes.map((n) => n.dimension)).toEqual([
    'structure',
    'specificity',
    'ownership',
  ]);
  expect(result.meta).toMatchObject({ model: 'mock', promptVersion: 'summary-v1', costUsd: 0 });
  expect(logs.join('')).toContain('summary.done');
  expect(logs.join('')).not.toContain('Private improvement point');
  expect(logs.join('')).not.toContain('rh1.');
});
it('TC-083 UT-34 session quota precedes global quota and never consumes per-IP feedback', async () => {
  const limiter = createMemoryLimiter();
  const daily = vi.spyOn(limiter, 'consumeDaily');
  vi.spyOn(limiterModule, 'getLimiter').mockReturnValue(limiter);
  const auth = { authorization: `Bearer ${token({ sm: 1 })}` };
  expect((await POST(request(body(), auth))).status).toBe(200);
  await error(request(body(), auth), 429, 'SESSION_SUMMARY_EXHAUSTED');
  expect(daily.mock.calls.map((c) => c[0])).toEqual(['llm_global']);
});
it('TC-083 UT-34 global denial and limiter outage fail closed', async () => {
  vi.stubEnv('RATE_LIMIT_GLOBAL_LLM_DAILY', '1');
  resetEnvForTests();
  expect((await POST(request())).status).toBe(200);
  await error(request(), 429, 'GLOBAL_CAP_REACHED');
  vi.spyOn(limiterModule, 'getLimiter').mockReturnValue(
    createMemoryLimiter(() => new Date(), { failing: true }),
  );
  await error(request(), 503, 'LIMITER_UNAVAILABLE');
});
it.each([
  ['provider-error', 502, 'PROVIDER_ERROR'],
  ['timeout', 504, 'PROVIDER_TIMEOUT'],
  ['invalid', 502, 'FEEDBACK_INVALID'],
] as const)(
  'TC-083 UT-34 mock:%s maps one attempt to safe errors',
  async (trigger, status, code) => {
    const data = body();
    data.items[0]!.improvementPoints = [`mock:${trigger}`];
    await error(request(data), status, code);
    expect(logs.join('')).toContain('summary.failed');
  },
);
it('TC-083 UT-34 unexpected failures stay private', async () => {
  vi.spyOn(providerModule, 'getProvider').mockImplementation(() => {
    throw new Error('private detail');
  });
  await error(request(), 500, 'INTERNAL_ERROR');
  expect(logs.join('')).not.toContain('private detail');
});
