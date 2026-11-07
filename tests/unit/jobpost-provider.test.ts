import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { ENV_NAMES } from '../fixtures/env';
const sdk = vi.hoisted(() => ({
  generate: vi.fn(),
  openai: vi.fn(),
  anthropic: vi.fn(),
  google: vi.fn(),
}));
vi.mock('ai', async (original) => ({
  ...(await original<typeof import('ai')>()),
  generateText: sdk.generate,
}));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: sdk.openai }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: sdk.anthropic }));
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: sdk.google }));
import { getEnv, resetEnvForTests } from '@/lib/env';
import { getJobpostProvider, jobpostPrices } from '@/lib/jobpost/provider';
beforeEach(() => {
  const example = parseEnv(readFileSync('.env.example', 'utf8'));
  for (const name of ENV_NAMES) vi.stubEnv(name, example[name]);
  vi.stubEnv('LLM_MODE', 'live');
  vi.stubEnv('OPENAI_API_KEY', 'fake-openai');
  vi.stubEnv('CHAT_MODEL', 'fixture-feedback');
  vi.stubEnv('PRICE_INPUT_PER_MTOK', '1');
  vi.stubEnv('PRICE_OUTPUT_PER_MTOK', '2');
  vi.stubEnv('PRICE_CACHED_INPUT_PER_MTOK', '0.5');
  vi.clearAllMocks();
  for (const factory of [sdk.openai, sdk.anthropic, sdk.google])
    factory.mockImplementation(() => (model: string) => ({ modelId: model }));
  sdk.generate.mockResolvedValue({
    output: { value: 'ok' },
    usage: { inputTokens: 12, outputTokens: 4, inputTokenDetails: { cacheReadTokens: 2 } },
  });
  resetEnvForTests();
});
it.each(['openai', 'anthropic', 'google'] as const)(
  'TC-223 %s receives only its configured key/model and no SDK retries',
  async (provider) => {
    vi.stubEnv('JOBPOST_PROVIDER', provider);
    vi.stubEnv('JOBPOST_MODEL', 'fixture-job');
    vi.stubEnv('JOBPOST_PRICE_INPUT_PER_MTOK', '3');
    vi.stubEnv('JOBPOST_PRICE_OUTPUT_PER_MTOK', '6');
    vi.stubEnv('ANTHROPIC_API_KEY', 'fake-anthropic');
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'fake-google');
    const client = getJobpostProvider();
    expect(client.modelId).toBe('fixture-job');
    expect(sdk[provider]).toHaveBeenCalledWith({ apiKey: `fake-${provider}` });
    const result = await client.generateStructured({
      schema: z.object({ value: z.string() }),
      schemaName: 'jobpost_analysis',
      system: 'fixture',
      prompt: 'fixture',
      maxOutputTokens: 2000,
      signal: new AbortController().signal,
    });
    expect(sdk.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: 'fixture-job' },
        maxRetries: 0,
        maxOutputTokens: 2000,
      }),
    );
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 4, cachedInputTokens: 2 });
    expect(jobpostPrices()).toEqual({ input: 3, output: 6, cachedInput: 3 });
    expect(getEnv().CHAT_MODEL).toBe('fixture-feedback');
  },
);
it.each(['anthropic', 'google'] as const)(
  'TC-223 %s requires its key, explicit model and prices',
  (provider) => {
    vi.stubEnv('JOBPOST_PROVIDER', provider);
    expect(getEnv).toThrow();
  },
);
it('TC-223 unset job configuration inherits OpenAI chat model and prices', () => {
  expect(getEnv()).toMatchObject({
    JOBPOST_PROVIDER: 'openai',
    JOBPOST_MODEL: 'fixture-feedback',
    JOBPOST_PRICE_INPUT_PER_MTOK: 1,
    JOBPOST_PRICE_OUTPUT_PER_MTOK: 2,
  });
});
it('TC-223 demo ignores job provider secrets and never constructs a provider', () => {
  vi.stubEnv('APP_EDITION', 'demo');
  vi.stubEnv('JOBPOST_PROVIDER', 'invalid');
  expect(getEnv().JOBPOST_PROVIDER).toBe('openai');
  expect(() => getJobpostProvider()).toThrow();
  expect(sdk.google).not.toHaveBeenCalled();
  expect(sdk.anthropic).not.toHaveBeenCalled();
  expect(sdk.openai).not.toHaveBeenCalled();
});
