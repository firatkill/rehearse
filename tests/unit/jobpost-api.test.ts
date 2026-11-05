import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { POST } from '@/app/api/job-posts/route';
import { POST as start } from '@/app/api/sessions/start/route';
import { POST as feedback } from '@/app/api/feedback/route';
import { getEnv, resetEnvForTests } from '@/lib/env';
import { getSqliteConnection } from '@/lib/storage/sqlite/repository';
import { JobResponseSchema } from '@/lib/api/jobpost-contracts';
import { StartResponseSchema } from '@/lib/api/contracts';
import * as providers from '@/lib/llm';
import { verifyToken } from '@/lib/session/token';
import { jobText } from '../fixtures/jobpost';
const dir = mkdtempSync(join(tmpdir(), 'rehearse-job-api-'));
beforeAll(() => {
  vi.stubEnv('DATA_DIR', dir);
  vi.stubEnv('MOCK_LLM_DELAY_MS', '0');
  resetEnvForTests();
});
afterAll(() => {
  vi.stubEnv('APP_EDITION', 'full');
  resetEnvForTests();
  getSqliteConnection().close();
  rmSync(dir, { recursive: true, force: true });
  resetEnvForTests();
});
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/job-posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...headers },
    body: JSON.stringify(body),
  });
}
it('TC-173 demo rejects job generation before constructing a provider', async () => {
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  const provider = vi.spyOn(providers, 'getProvider');
  expect((await POST(request({ operation: 'create', text: jobText }))).status).toBe(403);
  expect(provider).not.toHaveBeenCalled();
  vi.stubEnv('APP_EDITION', 'full');
  resetEnvForTests();
});
it('TC-176 full persists reviewed text and generated ids; server question scope drives feedback', async () => {
  vi.stubEnv('DATA_DIR', dir);
  vi.stubEnv('MOCK_LLM_DELAY_MS', '0');
  resetEnvForTests();
  expect(
    (
      await POST(
        request({ operation: 'create', text: jobText }, { origin: 'https://foreign.invalid' }),
      )
    ).status,
  ).toBe(403);
  const created = JobResponseSchema.parse(
    await (await POST(request({ operation: 'create', text: jobText }))).json(),
  );
  expect(created.questions).toEqual([]);
  const edited = JobResponseSchema.parse(
    await (
      await POST(
        request({
          operation: 'updateText',
          id: created.post.id,
          text: jobText + '\nMentor colleagues through constructive code reviews.',
        }),
      )
    ).json(),
  );
  expect(edited.post.text).toContain('Mentor colleagues');
  const response = await POST(request({ operation: 'generate', id: edited.post.id }));
  expect(response.status).toBe(200);
  const generated = JobResponseSchema.parse(await response.json());
  expect(generated.questions).toHaveLength(8);
  const ids = generated.questions.slice(0, 3).map((q) => q.id);
  const body = {
    jobPostId: generated.post.id,
    questionIds: ids,
    role: 'frontend',
    seniority: 'mid',
    types: ['behavioral'],
    length: 3,
    mode: 'text',
  };
  const startedResponse = await start(request(body));
  expect(startedResponse.status).toBe(200);
  const session = StartResponseSchema.parse(await startedResponse.json());
  expect(session.questions.map((q) => q.id)).toEqual(ids);
  const token = verifyToken(
    session.token!,
    [getEnv().SESSION_SECRET],
    Math.floor(Date.now() / 1000),
  );
  expect(token.ok && token.payload.r).toBe(generated.post.practiceRole);
  const result = await feedback(
    request(
      {
        sessionId: session.sessionId,
        answerIndex: 0,
        questionId: ids[0],
        mode: 'text',
        transcript: 'I built a dashboard and reduced errors by 20 percent. '.repeat(8),
      },
      { 'x-rehearse-session': session.token! },
    ),
  );
  expect(result.status).toBe(200);
  expect(
    (
      await start(
        request({ ...body, questionIds: [`gen-${crypto.randomUUID()}`, ...ids.slice(1)] }),
      )
    ).status,
  ).toBe(403);
  const revision = JobResponseSchema.parse(
    await (
      await POST(
        request({
          operation: 'updateText',
          id: generated.post.id,
          text: jobText + '\nDifferent revision.',
        }),
      )
    ).json(),
  );
  expect(revision.post.id).not.toBe(generated.post.id);
  expect(revision.questions).toEqual([]);
});

it('TC-179 full adds five unique questions; duplicate provider output never stores repeats; demo blocks more', async () => {
  vi.stubEnv('DATA_DIR', dir);
  vi.stubEnv('MOCK_LLM_DELAY_MS', '0');
  resetEnvForTests();
  const draft = JobResponseSchema.parse(
    await (await POST(request({ operation: 'create', text: jobText }))).json(),
  );
  expect((await POST(request({ operation: 'more', id: draft.post.id }))).status).toBe(400);
  const first = JobResponseSchema.parse(
    await (await POST(request({ operation: 'generate', id: draft.post.id }))).json(),
  );
  const response = await POST(request({ operation: 'more', id: draft.post.id }));
  expect(response.status).toBe(200);
  const more = JobResponseSchema.parse(await response.json());
  expect(more.questions).toHaveLength(13);
  expect(more.questions.slice(0, 8)).toEqual(first.questions);
  expect(new Set(more.questions.map((q) => q.text)).size).toBe(13);
  const repeated = vi.spyOn(providers, 'getProvider').mockReturnValue({
    modelId: 'fake',
    async generateStructured(args) {
      await Promise.resolve();
      const { role, company, location, requirements, about } = first.post;
      return {
        object: args.schema.parse({
          role,
          company,
          location,
          requirements,
          about,
          questions: first.questions.map(({ text, type, groundingQuote, listenFor }) => ({
            text,
            type,
            groundingQuote,
            listenFor,
          })),
        }),
        usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
      };
    },
  });
  expect((await POST(request({ operation: 'more', id: draft.post.id }))).status).toBe(502);
  repeated.mockRestore();
  const unchanged = JobResponseSchema.parse(
    await (await POST(request({ operation: 'get', id: draft.post.id }))).json(),
  );
  expect(unchanged.questions).toEqual(more.questions);
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  const provider = vi.spyOn(providers, 'getProvider');
  provider.mockClear();
  expect((await POST(request({ operation: 'more', id: draft.post.id }))).status).toBe(403);
  expect(provider).not.toHaveBeenCalled();
});
