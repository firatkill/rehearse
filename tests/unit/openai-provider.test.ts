import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { APICallError, NoObjectGeneratedError, NoOutputGeneratedError } from 'ai';
import { createOpenAiProvider } from '@/lib/llm/openai';
import { resetEnvForTests } from '@/lib/env';
import { InvalidOutputError, ProviderError, ProviderTimeoutError } from '@/lib/llm/provider';
const sdk = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('ai', async (original) => ({
  ...(await original<typeof import('ai')>()),
  generateText: sdk.generate,
}));
const args = () => ({
  schema: z.object({ ok: z.boolean() }),
  schemaName: 'toy',
  system: 'system',
  prompt: 'private transcript',
  maxOutputTokens: 400,
  signal: new AbortController().signal,
});
beforeEach(() => {
  sdk.generate.mockReset();
  vi.stubEnv('LLM_MODE', 'live');
  vi.stubEnv('OPENAI_API_KEY', 'fake-test-key');
  vi.stubEnv('CHAT_MODEL', 'test-model');
  vi.stubEnv('PRICE_INPUT_PER_MTOK', '1');
  vi.stubEnv('PRICE_OUTPUT_PER_MTOK', '2');
  vi.stubEnv('CHAT_MODEL_SUPPORTS_TEMPERATURE', 'true');
  vi.stubEnv('CHAT_REASONING_EFFORT', '');
  resetEnvForTests();
});
describe('TC-070 TRD §14.0 OpenAI adapter', () => {
  it('uses structured output, disables retries and strict schema; maps nested cache usage', async () => {
    sdk.generate.mockResolvedValue({
      output: { ok: true },
      usage: { inputTokens: 12, outputTokens: 3, inputTokenDetails: { cacheReadTokens: 4 } },
    });
    const provider = createOpenAiProvider();
    expect(provider.modelId).toBe('test-model');
    const input = args();
    await expect(provider.generateStructured(input)).resolves.toEqual({
      object: { ok: true },
      usage: { inputTokens: 12, outputTokens: 3, cachedInputTokens: 4 },
    });
    expect(sdk.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRetries: 0,
        temperature: 0,
        abortSignal: input.signal,
        maxOutputTokens: 400,
        instructions: input.system,
        prompt: input.prompt,
        providerOptions: { openai: { strictJsonSchema: false } },
      }),
    );
    const call: unknown = sdk.generate.mock.calls[0]?.[0];
    expect(call).toHaveProperty('output.name', 'object');
  });
  it('omits unsupported temperature and uses configured reasoning effort; missing usage is zero', async () => {
    vi.stubEnv('CHAT_MODEL_SUPPORTS_TEMPERATURE', 'false');
    vi.stubEnv('CHAT_REASONING_EFFORT', 'low');
    resetEnvForTests();
    sdk.generate.mockResolvedValue({ output: { ok: true }, usage: { inputTokenDetails: {} } });
    const result = await createOpenAiProvider().generateStructured(args());
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 });
    const call: unknown = sdk.generate.mock.calls[0]?.[0];
    expect(call).not.toHaveProperty('temperature');
    expect(call).toHaveProperty('providerOptions.openai.reasoningEffort', 'low');
  });
  it('rejects malformed output at the boundary', async () => {
    sdk.generate.mockResolvedValue({ output: { ok: 'wrong' }, usage: { inputTokenDetails: {} } });
    await expect(createOpenAiProvider().generateStructured(args())).rejects.toBeInstanceOf(
      InvalidOutputError,
    );
  });
  it.each([400, 401, 403, 404, 429, 500, 503])(
    'maps HTTP %i without exposing provider details',
    async (statusCode) => {
      sdk.generate.mockRejectedValue(
        new APICallError({
          message: 'private provider response',
          url: 'https://example.invalid',
          requestBodyValues: {},
          statusCode,
        }),
      );
      await expect(createOpenAiProvider().generateStructured(args())).rejects.toMatchObject({
        message: 'Provider request failed',
        retryable: statusCode === 429 || statusCode >= 500,
      });
    },
  );
  it('maps network errors to retryable safe errors', async () => {
    sdk.generate.mockRejectedValue(new TypeError('private network detail'));
    await expect(createOpenAiProvider().generateStructured(args())).rejects.toEqual(
      new ProviderError('Provider request failed', true),
    );
  });
  it.each(['AbortError', 'TimeoutError'])('maps %s to provider timeout', async (name) => {
    sdk.generate.mockRejectedValue(new DOMException('private detail', name));
    await expect(createOpenAiProvider().generateStructured(args())).rejects.toBeInstanceOf(
      ProviderTimeoutError,
    );
  });
  it('does not call SDK with an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createOpenAiProvider().generateStructured({ ...args(), signal: controller.signal }),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(sdk.generate).not.toHaveBeenCalled();
  });
  it('maps SDK no-output error', async () => {
    sdk.generate.mockRejectedValue(new NoOutputGeneratedError());
    await expect(createOpenAiProvider().generateStructured(args())).rejects.toBeInstanceOf(
      InvalidOutputError,
    );
  });
  it('maps SDK parse/schema failures without leaking generated text', async () => {
    sdk.generate.mockRejectedValue(
      new NoObjectGeneratedError({
        text: 'private model output',
        response: { id: 'test', modelId: 'test-model', timestamp: new Date(0) },
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          inputTokenDetails: { noCacheTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          outputTokenDetails: { textTokens: 0, reasoningTokens: 0 },
        },
        finishReason: 'stop',
      }),
    );
    await expect(createOpenAiProvider().generateStructured(args())).rejects.toEqual(
      new InvalidOutputError(),
    );
  });
  it('maps connection failures without status to retryable errors', async () => {
    sdk.generate.mockRejectedValue(
      new APICallError({
        message: 'private detail',
        url: 'https://example.invalid',
        requestBodyValues: {},
      }),
    );
    await expect(createOpenAiProvider().generateStructured(args())).rejects.toMatchObject({
      retryable: true,
      message: 'Provider request failed',
    });
  });
  it('rejects an unconfigured live adapter before using the SDK', () => {
    vi.stubEnv('LLM_MODE', 'mock');
    vi.stubEnv('OPENAI_API_KEY', '');
    resetEnvForTests();
    expect(createOpenAiProvider).toThrow(
      new ProviderError('Invalid provider configuration', false),
    );
    expect(sdk.generate).not.toHaveBeenCalled();
  });
});
