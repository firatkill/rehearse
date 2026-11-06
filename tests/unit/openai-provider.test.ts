import { generateFeedback } from '@/lib/feedback/generate';
import { getBank } from '@/lib/questions/bank';
import { feedbackLlm } from '../fixtures/feedback';
import { Output } from 'ai';
import { FeedbackLlmSchema } from '@/lib/feedback/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { APICallError, JSONParseError, NoObjectGeneratedError, NoOutputGeneratedError } from 'ai';
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
  it.each(['low', 'none'])(
    'omits temperature and forwards reasoning %s; missing usage is zero',
    async (effort) => {
      vi.stubEnv('CHAT_MODEL_SUPPORTS_TEMPERATURE', 'false');
      vi.stubEnv('CHAT_REASONING_EFFORT', effort);
      resetEnvForTests();
      sdk.generate.mockResolvedValue({ output: { ok: true }, usage: { inputTokenDetails: {} } });
      const result = await createOpenAiProvider().generateStructured(args());
      expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 });
      const call: unknown = sdk.generate.mock.calls[0]?.[0];
      expect(call).not.toHaveProperty('temperature');
      expect(call).toHaveProperty('providerOptions.openai.reasoningEffort', effort);
    },
  );
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
      new InvalidOutputError(
        'schema_parse',
        { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
        'stop',
      ),
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

it.each(['length', 'stop'] as const)(
  'TC-217 preserves failed SDK usage and safe %s reason',
  async (finishReason) => {
    sdk.generate.mockRejectedValue(
      new NoObjectGeneratedError({
        text: 'private model output',
        cause: new JSONParseError({ text: 'private', cause: new Error('private') }),
        response: { id: 'test', modelId: 'test', timestamp: new Date(0) },
        finishReason,
        usage: {
          inputTokens: 100,
          outputTokens: 900,
          totalTokens: 1000,
          inputTokenDetails: { noCacheTokens: 80, cacheReadTokens: 20, cacheWriteTokens: 0 },
          outputTokenDetails: { textTokens: 900, reasoningTokens: 0 },
        },
      }),
    );
    const error: unknown = await createOpenAiProvider()
      .generateStructured(args())
      .catch((value: unknown) => value);
    expect(error).toMatchObject({
      reason: finishReason === 'length' ? 'truncated' : 'json_parse',
      finishReason,
      usage: { inputTokens: 100, outputTokens: 900, cachedInputTokens: 20 },
    });
    expect(JSON.stringify(error)).not.toContain('private');
    expect(error).not.toHaveProperty('cause');
  },
);

it.each(['en', 'tr'] as const)(
  'TC-219 %s feedback sends the selected strict mode through the real adapter',
  async (language) => {
    sdk.generate.mockResolvedValue({
      output: feedbackLlm(),
      usage: { inputTokens: 100, outputTokens: 400, inputTokenDetails: {} },
    });
    await generateFeedback({
      language,
      question: getBank().questions[0]!,
      role: 'backend',
      seniority: 'mid',
      mode: 'text',
      transcript: 'I delivered the project. '.repeat(15),
      provider: createOpenAiProvider(),
      maxOutputTokens: language === 'tr' ? 1400 : 900,
    });
    expect(sdk.generate).toHaveBeenCalledOnce();
    expect(sdk.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRetries: 0,
        providerOptions: { openai: { strictJsonSchema: language === 'tr' } },
      }),
    );
  },
);
it.each(['interview_summary', 'interview_summary_tr', 'jobpost_questions', 'jobpost_questions_tr'])(
  'TC-219 %s retains non-strict provider options',
  async (schemaName) => {
    sdk.generate.mockResolvedValue({
      output: { ok: true },
      usage: { inputTokens: 1, outputTokens: 1, inputTokenDetails: {} },
    });
    await createOpenAiProvider().generateStructured({ ...args(), schemaName });
    expect(sdk.generate).toHaveBeenCalledWith(
      expect.objectContaining({ providerOptions: { openai: { strictJsonSchema: false } } }),
    );
  },
);
it('TC-219 SDK-converted feedback schema uses only supported strict-schema keywords', async () => {
  const format = await Output.object({ schema: FeedbackLlmSchema }).responseFormat;
  expect(format?.type).toBe('json');
  if (!format || format.type !== 'json') throw new Error('Expected JSON response format');
  const root = z.record(z.string(), z.unknown()).parse(format.schema);
  let objects = 0;
  function inspect(value: unknown) {
    const node = z.record(z.string(), z.unknown()).parse(value);
    expect(
      Object.keys(node).every((key) =>
        [
          '$schema',
          'type',
          'properties',
          'required',
          'additionalProperties',
          'items',
          'enum',
        ].includes(key),
      ),
    ).toBe(true);
    if (node.type === 'object') {
      objects++;
      const properties = z.record(z.string(), z.unknown()).parse(node.properties);
      expect(node.additionalProperties).toBe(false);
      expect(z.array(z.string()).parse(node.required).sort()).toEqual(
        Object.keys(properties).sort(),
      );
      Object.values(properties).forEach(inspect);
    } else if (node.type === 'array') inspect(node.items);
    else expect(['string', 'number', 'boolean']).toContain(node.type);
  }
  expect(root.type).toBe('object');
  inspect(root);
  expect(objects).toBe(11);
});
it('TC-219 Turkish feedback retains strict mode on its single validation retry', async () => {
  sdk.generate.mockRejectedValueOnce(new InvalidOutputError('json_parse')).mockResolvedValueOnce({
    output: feedbackLlm(),
    usage: { inputTokens: 100, outputTokens: 400, inputTokenDetails: {} },
  });
  const result = await generateFeedback({
    language: 'tr',
    question: getBank().questions[0]!,
    role: 'backend',
    seniority: 'mid',
    mode: 'text',
    transcript: 'I delivered the project. '.repeat(15),
    provider: createOpenAiProvider(),
    maxOutputTokens: 1400,
  });
  expect(result.attempts).toBe(2);
  expect(sdk.generate).toHaveBeenCalledTimes(2);
  for (const call of sdk.generate.mock.calls)
    expect(call[0]).toMatchObject({
      maxRetries: 0,
      providerOptions: { openai: { strictJsonSchema: true } },
    });
});
