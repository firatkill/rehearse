import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/feedback/route';
import { getEnv, resetEnvForTests } from '@/lib/env';
import * as limiterModule from '@/lib/ratelimit';
import * as loggerModule from '@/lib/logger';
import * as providerModule from '@/lib/llm';
import { createMemoryLimiter } from '@/lib/ratelimit/memory';
import { signToken, type TokenPayload } from '@/lib/session/token';
import { getBank } from '@/lib/questions/bank';
import { FeedbackResponseSchema, ErrorBodySchema } from '@/lib/api/contracts';
import { sessionId } from '../fixtures/api';
const question = getBank().questions[0]!;
const logs: string[] = [];
const text =
  'I delivered the project and reduced retries from 10 to 2. ' +
  'I explained the concrete outcome to the team. '.repeat(6);
function payload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
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
  };
}
function token(overrides: Partial<TokenPayload> = {}) {
  return signToken(payload(overrides), getEnv().SESSION_SECRET);
}
const body = () => ({
  sessionId,
  answerIndex: 0,
  questionId: question.id,
  mode: 'text',
  transcript: text,
});
function request(data: unknown = body(), headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      authorization: `Bearer ${token()}`,
      'x-real-ip': '10.76.0.1',
      ...headers,
    },
    body: JSON.stringify(data),
  });
}
async function error(req: Request, status: number, code: string) {
  const res = await POST(req);
  expect(res.status).toBe(status);
  const parsed = ErrorBodySchema.parse(await res.json());
  expect(parsed.error.code).toBe(code);
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('x-request-id')).toBeTruthy();
  return parsed.error;
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
it('TC-217 TC-210 TC-211 signed Turkish feedback uses only the Turkish bank and prompt', async () => {
  const transcript =
    'Geçen ay ekipte kapsamı daralttım. Önce kullanıcı ihtiyacını inceledim ve teslim tarihini korumak için üç işi erteledim. Sonucu iki hafta ölçtüm.';
  const data = { ...body(), questionId: 'beh-501', transcript };
  const auth = {
    authorization: `Bearer ${token({ l: 'tr', q: ['beh-501', 'beh-502', 'beh-503'] })}`,
  };
  const provider = providerModule.getProvider();
  const call = vi.spyOn(provider, 'generateStructured');
  vi.spyOn(providerModule, 'getProvider').mockReturnValue(provider);
  const response = await POST(request(data, auth));
  expect(call).toHaveBeenCalledWith(expect.objectContaining({ maxOutputTokens: 1400 }));
  expect(response.status).toBe(200);
  const parsed = FeedbackResponseSchema.parse(await response.json());
  expect(parsed.meta.promptVersion).toBe('feedback-tr-v2');
  expect(parsed.feedback.follow_up_question).toBe(
    'Bu kararı verirken hangi alternatifi eledin ve neden?',
  );
  await error(
    request(data, {
      authorization: `Bearer ${token({ l: 'en', q: ['beh-501', 'beh-502', 'beh-503'] })}`,
    }),
    403,
    'TOKEN_SCOPE',
  );
});
it('TC-076 UT-33 enforces media, size, JSON, origin, demo and token order', async () => {
  await error(
    request(
      {},
      { 'content-type': 'text/plain', origin: 'https://wrong.invalid', authorization: '' },
    ),
    415,
    'UNSUPPORTED_MEDIA_TYPE',
  );
  await error(request({}, { 'content-length': '32769', authorization: '' }), 413, 'BODY_TOO_LARGE');
  await error(
    new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }),
    400,
    'VALIDATION_FAILED',
  );
  await error(
    request({}, { origin: 'https://wrong.invalid', authorization: '' }),
    403,
    'ORIGIN_FORBIDDEN',
  );
  vi.stubEnv('DEMO_MODE', 'off');
  resetEnvForTests();
  await error(request({}, { authorization: '' }), 503, 'DEMO_OFF');
  vi.stubEnv('DEMO_MODE', 'readonly');
  resetEnvForTests();
  await error(request({}, { authorization: '' }), 503, 'DEMO_READONLY');
  vi.stubEnv('DEMO_MODE', 'on');
  resetEnvForTests();
  await error(request({}, { authorization: '' }), 401, 'TOKEN_MISSING');
  await error(request({}, { authorization: 'Bearer invalid' }), 401, 'TOKEN_INVALID');
  await error(request({}), 400, 'VALIDATION_FAILED');
});
it('TC-076 UT-33 rejects expired tokens before transcript validation', async () => {
  const now = Math.floor(Date.now() / 1000);
  await error(
    request({}, { authorization: `Bearer ${token({ iat: now - 7201, exp: now - 1 })}` }),
    401,
    'TOKEN_EXPIRED',
  );
});
it('TC-076 UT-33 validates transcripts and rejects scoring inputs from the client', async () => {
  const provider = vi.spyOn(providerModule, 'getProvider');
  await error(request({ ...body(), transcript: ' \u0000 ' }), 400, 'TRANSCRIPT_EMPTY');
  await error(request({ ...body(), transcript: 'a'.repeat(4001) }), 400, 'TRANSCRIPT_TOO_LONG');
  await error(
    request({ ...body(), role: 'senior', question: 'untrusted' }),
    400,
    'VALIDATION_FAILED',
  );
  expect(provider).not.toHaveBeenCalled();
});
it('TC-076 UT-33 enforces session, answer-index, question and bank scope', async () => {
  const limiter = vi.spyOn(limiterModule, 'getLimiter');
  await error(
    request({ ...body(), sessionId: 'cf731235-9e70-4e1c-8efb-e72c1966363b' }),
    403,
    'TOKEN_SCOPE',
  );
  await error(request({ ...body(), answerIndex: 1 }), 403, 'TOKEN_SCOPE');
  await error(request({ ...body(), questionId: getBank().questions[1]!.id }), 403, 'TOKEN_SCOPE');
  await error(
    request(
      { ...body(), questionId: 'beh-999' },
      {
        authorization: `Bearer ${token({ q: ['beh-999', getBank().questions[1]!.id, getBank().questions[2]!.id] })}`,
      },
    ),
    403,
    'TOKEN_SCOPE',
  );
  expect(limiter).not.toHaveBeenCalled();
});
it('TC-076 UT-33 succeeds with remaining quotas and never logs transcript or model text', async () => {
  const res = await POST(request());
  expect(res.status).toBe(200);
  const parsed = FeedbackResponseSchema.parse(await res.json());
  expect(parsed.remaining).toEqual({ session: 4, visitorToday: Number.MAX_SAFE_INTEGER });
  expect(parsed.meta).toMatchObject({
    model: 'mock',
    costUsd: 0,
    attempts: 1,
    promptVersion: 'feedback-v8',
  });
  const output = logs.join('');
  expect(output).toContain('feedback.done');
  expect(output).not.toContain(text);
  expect(output).not.toContain(parsed.feedback.follow_up_question);
  expect(output).not.toContain('10.76.0.1');
  expect(output).not.toContain(getEnv().SESSION_SECRET);
});
it.each([
  ['mock:provider-error', 502, 'PROVIDER_ERROR', 1],
  ['mock:timeout', 504, 'PROVIDER_TIMEOUT', 2],
  ['mock:invalid', 502, 'FEEDBACK_INVALID', 2],
] as const)(
  'TC-076 UT-33 maps %s with remaining attempts and safe logs',
  async (trigger, status, code, attempts) => {
    const result = await error(request({ ...body(), transcript: trigger }), status, code);
    expect(result.sessionCallsRemaining).toBe(4);
    const entry = logs
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((row) => row.event === 'feedback.failed');
    expect(entry).toMatchObject({ code, attempts });
    expect(logs.join('')).not.toContain(trigger);
  },
);
it('TC-076 UT-33 invalid-once retries without consuming a second session call', async () => {
  const res = await POST(request({ ...body(), transcript: 'mock:invalid-once TC-076 request' }));
  const parsed = FeedbackResponseSchema.parse(await res.json());
  expect(parsed.meta.attempts).toBe(2);
  expect(parsed.remaining.session).toBe(4);
});
it('TC-076 UT-33 session denial happens before visitor/global quotas and generation', async () => {
  const auth = `Bearer ${token({ fb: 1 })}`;
  await POST(request(body(), { authorization: auth }));
  const provider = vi.spyOn(providerModule, 'getProvider');
  await error(request(body(), { authorization: auth }), 429, 'SESSION_FEEDBACK_EXHAUSTED');
  expect(provider).not.toHaveBeenCalled();
});
it.each(['RATE_LIMIT_FEEDBACK_PER_IP_DAILY', 'RATE_LIMIT_GLOBAL_LLM_DAILY'] as const)(
  'TC-076 UT-33 D-80 %s does not impose a full-edition daily block',
  async (name) => {
    vi.stubEnv(name, '1');
    resetEnvForTests();
    await POST(request());
    const result = FeedbackResponseSchema.parse(await (await POST(request())).json());
    expect(result.remaining.session).toBe(3);
    expect(result.remaining.visitorToday).toBe(Number.MAX_SAFE_INTEGER);
  },
);
it('TC-076 UT-33 fails closed when the limiter is unavailable', async () => {
  vi.spyOn(limiterModule, 'getLimiter').mockReturnValue(
    createMemoryLimiter(() => new Date(), { failing: true }),
  );
  const provider = vi.spyOn(providerModule, 'getProvider');
  await error(request(), 503, 'LIMITER_UNAVAILABLE');
  expect(provider).not.toHaveBeenCalled();
});
it('TC-076 UT-33 unexpected work errors retain quota counts and hide details', async () => {
  vi.spyOn(providerModule, 'getProvider').mockImplementation(() => {
    throw Error(text);
  });
  const result = await error(request(), 500, 'INTERNAL_ERROR');
  expect(result.sessionCallsRemaining).toBe(4);
  expect(logs.join('')).not.toContain(text);
});
it('TC-076 UT-33 failure logs follow TRD §20 severity without private text', async () => {
  await error(request({}, { authorization: '' }), 401, 'TOKEN_MISSING');
  await error(request({}, { authorization: 'Bearer invalid' }), 401, 'TOKEN_INVALID');
  vi.spyOn(providerModule, 'getProvider').mockImplementation(() => {
    throw new Error('private provider detail');
  });
  await error(request(), 500, 'INTERNAL_ERROR');
  const entries = logs.map((line) => JSON.parse(line) as { level: number; code: string });
  expect(entries.map((entry) => [entry.code, entry.level])).toEqual([
    ['TOKEN_MISSING', 30],
    ['TOKEN_INVALID', 40],
    ['INTERNAL_ERROR', 50],
  ]);
  expect(logs.join('')).not.toContain('private provider detail');
});

it('TC-149 authenticates follow-ups before provider use and scores the signed prompt once', async () => {
  // A real session retains its original token; never mint a new expiry per request.
  const headers = { authorization: `Bearer ${token()}` };
  const initial = FeedbackResponseSchema.parse(await (await POST(request(body(), headers))).json());
  expect(initial.followUpToken).toMatch(/^rf1\./);
  const provider = providerModule.getProvider();
  const spy = vi.spyOn(provider, 'generateStructured');
  vi.spyOn(providerModule, 'getProvider').mockReturnValue(provider);
  await error(
    request({ ...body(), followUpToken: 'rf1.forged.invalid' }, headers),
    401,
    'TOKEN_INVALID',
  );
  expect(spy).not.toHaveBeenCalled();
  const result = await POST(request({ ...body(), followUpToken: initial.followUpToken }, headers));
  expect(result.status).toBe(200);
  expect(spy).toHaveBeenCalledOnce();
  expect(spy.mock.calls[0]?.[0].prompt).toContain(
    `<follow_up_question>\n${initial.feedback.follow_up_question}\n</follow_up_question>`,
  );
  expect(FeedbackResponseSchema.parse(await result.json()).followUpToken).toBeNull();
});
it('TC-165 D-82 session proof coexists with Basic authentication', async () => {
  const response = await POST(
    request(body(), { authorization: 'Basic cmVoZWFyc2U6dGVzdA==', 'x-rehearse-session': token() }),
  );
  expect(response.status).toBe(200);
  await error(
    request(body(), {
      authorization: 'Basic cmVoZWFyc2U6dGVzdA==',
      'x-rehearse-session': 'invalid',
    }),
    401,
    'TOKEN_INVALID',
  );
});
