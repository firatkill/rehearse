import { beforeEach, expect, it, vi } from 'vitest';
import { getEnv, resetEnvForTests } from '@/lib/env';
import {
  aiReadEstimate,
  createAiJobReader,
  readJobWithAi,
  type AiJobReader,
} from '@/lib/jobpost/ai-reader';
import { JOBPOST } from '@/lib/config';
const mocks = vi.hoisted(() => ({ generate: vi.fn(), record: vi.fn(), log: vi.fn() }));
vi.mock('ai', async (original) => ({
  ...(await original<typeof import('ai')>()),
  generateText: mocks.generate,
}));
vi.mock('@/lib/cost/budget', () => ({ recordCost: mocks.record }));
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ info: mocks.log }) }));
const url = new URL('https://example.com/jobs/123');
const resolve = () => Promise.resolve([{ address: '8.8.8.8', family: 4 }]);
beforeEach(() => {
  vi.clearAllMocks();
  resetEnvForTests();
});
function live() {
  vi.stubEnv('LLM_MODE', 'live');
  vi.stubEnv('OPENAI_API_KEY', 'fake-key');
  vi.stubEnv('CHAT_MODEL', 'fake-model');
  vi.stubEnv('PRICE_INPUT_PER_MTOK', '1');
  vi.stubEnv('PRICE_OUTPUT_PER_MTOK', '2');
  vi.stubEnv('PRICE_WEB_SEARCH_PER_CALL', '0.01');
  resetEnvForTests();
}
it('TC-222 SDK contract uses Responses web search, strict output, one tool call and no retries', async () => {
  live();
  mocks.generate.mockResolvedValue({
    output: { text: 'A job post' },
    sources: [{ sourceType: 'url', url: url.href }],
    toolResults: [
      { toolName: 'web_search', output: { action: { type: 'openPage', url: url.href } } },
    ],
  });
  const onUsage = vi.fn();
  await expect(
    createAiJobReader(getEnv())({ url, signal: new AbortController().signal, onUsage }),
  ).resolves.toMatchObject({ text: 'A job post' });
  expect(mocks.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      maxRetries: 0,
      maxOutputTokens: JOBPOST.AI_READ_MAX_OUTPUT_TOKENS,
      toolChoice: { type: 'tool', toolName: 'web_search' },
      providerOptions: {
        openai: { strictJsonSchema: true, maxToolCalls: 1, store: false },
      },
    }),
  );
  const args = mocks.generate.mock.calls[0]?.[0] as {
    onStepEnd: (step: unknown) => void;
    tools: unknown;
    model: { provider: string };
  };
  expect(args.model.provider).toBe('openai.responses');
  expect(args.tools).toMatchObject({
    web_search: { args: { filters: { allowedDomains: ['example.com'] } } },
  });
  args.onStepEnd({
    usage: { inputTokens: 12, outputTokens: 3, inputTokenDetails: { cacheReadTokens: 2 } },
  });
  expect(onUsage).toHaveBeenCalledWith({ inputTokens: 12, outputTokens: 3, cachedInputTokens: 2 });
});
it('TC-222 exact source and text validation retain costs even when returned evidence is rejected', async () => {
  live();
  const reader: AiJobReader = ({ onUsage }) => {
    onUsage({ inputTokens: 100, outputTokens: 100, cachedInputTokens: 0 });
    return Promise.resolve({ text: 'Wrong page', sources: ['https://example.com/jobs/456'] });
  };
  await expect(readJobWithAi(url.href, 'failed-read', { reader, resolve })).rejects.toMatchObject({
    code: 'JOBPOST_AI_READ_FAILED',
  });
  expect(mocks.record).toHaveBeenCalledWith('failed-read', expect.closeTo(0.0103));
  expect(JSON.stringify(mocks.log.mock.calls)).not.toContain('Wrong page');
  expect(JSON.stringify(mocks.log.mock.calls)).not.toContain('/jobs/');
});
it('TC-222 returns only reviewed text with matching source; empty and mixed-source output fail', async () => {
  for (const sources of [[], [url.href, 'https://elsewhere.example/jobs/123']])
    await expect(
      readJobWithAi(url.href, 'read', {
        resolve,
        reader: () => Promise.resolve({ text: 'Valid-looking post', sources }),
      }),
    ).rejects.toThrow();
  await expect(
    readJobWithAi(url.href, 'read', {
      resolve,
      reader: () => Promise.resolve({ text: '', sources: [url.href] }),
    }),
  ).rejects.toThrow();
  await expect(
    readJobWithAi(url.href, 'read', {
      resolve,
      reader: () => Promise.resolve({ text: 'An exact post', sources: [url.href] }),
    }),
  ).resolves.toEqual({ text: 'An exact post', sourceUrl: url.href });
});
it('TC-222 private targets and demo are rejected before provider construction', async () => {
  const reader = vi.fn<AiJobReader>();
  await expect(readJobWithAi('http://127.0.0.1/private', 'blocked', { reader })).rejects.toThrow();
  expect(reader).not.toHaveBeenCalled();
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  expect(aiReadEstimate(getEnv())).toBeNull();
  expect(() => createAiJobReader(getEnv())).toThrow();
  await expect(readJobWithAi(url.href, 'demo', { reader, resolve })).rejects.toMatchObject({
    code: 'DEMO_ONLY',
  });
  expect(reader).not.toHaveBeenCalled();
});
it('TC-222 missing tool price disables live reading instead of claiming zero cost', () => {
  live();
  vi.stubEnv('PRICE_WEB_SEARCH_PER_CALL', '');
  resetEnvForTests();
  expect(aiReadEstimate(getEnv())).toBeNull();
  expect(() => createAiJobReader(getEnv())).toThrow();
});
it('TC-222 deadline also bounds a stalled resolver', async () => {
  vi.useFakeTimers();
  const reader = vi.fn<AiJobReader>();
  const work = readJobWithAi(url.href, 'timeout', { reader, resolve: () => new Promise(() => {}) });
  const check = expect(work).rejects.toMatchObject({ code: 'JOBPOST_AI_READ_FAILED' });
  await vi.advanceTimersByTimeAsync(JOBPOST.AI_READ_TIMEOUT_MS);
  await check;
  expect(reader).not.toHaveBeenCalled();
  vi.useRealTimers();
});
