import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, Output, NoObjectGeneratedError, NoOutputGeneratedError } from 'ai';
import { getEnv } from '@/lib/env';
import { getProvider } from '@/lib/llm';
import { createMockProvider } from '@/lib/llm/mock';
import {
  InvalidOutputError,
  ProviderError,
  ProviderTimeoutError,
  type LlmProvider,
} from '@/lib/llm/provider';
import { AppError } from '@/lib/errors';
export function getJobpostProvider(): LlmProvider {
  const env = getEnv();
  if (env.APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
  if (env.LLM_MODE === 'mock') return createMockProvider();
  const modelId = env.JOBPOST_MODEL;
  if (!modelId) throw new ProviderError('Invalid job provider configuration', false);
  if (env.JOBPOST_PROVIDER === 'openai' && modelId === env.CHAT_MODEL) return getProvider();
  const apiKey =
    env.JOBPOST_PROVIDER === 'anthropic'
      ? env.ANTHROPIC_API_KEY
      : env.JOBPOST_PROVIDER === 'google'
        ? env.GOOGLE_GENERATIVE_AI_API_KEY
        : env.OPENAI_API_KEY;
  if (!apiKey) throw new ProviderError('Missing job provider key', false);
  const model =
    env.JOBPOST_PROVIDER === 'anthropic'
      ? createAnthropic({ apiKey })(modelId)
      : env.JOBPOST_PROVIDER === 'google'
        ? createGoogleGenerativeAI({ apiKey })(modelId)
        : createOpenAI({ apiKey })(modelId);
  return {
    modelId,
    async generateStructured(args) {
      try {
        const result = await generateText({
          model,
          instructions: args.system,
          prompt: args.prompt,
          output: Output.object({ schema: args.schema, name: args.schemaName }),
          maxOutputTokens: args.maxOutputTokens,
          maxRetries: 0,
          abortSignal: args.signal,
          ...(env.JOBPOST_PROVIDER === 'openai'
            ? { providerOptions: { openai: { strictJsonSchema: false } } }
            : {}),
        });
        const object = args.schema.safeParse(result.output);
        if (!object.success) throw new InvalidOutputError('schema_parse');
        return {
          object: object.data,
          usage: {
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
            cachedInputTokens: result.usage.inputTokenDetails.cacheReadTokens ?? 0,
          },
        };
      } catch (error) {
        if (args.signal.aborted) throw new ProviderTimeoutError();
        if (error instanceof InvalidOutputError) throw error;
        if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error))
          throw new InvalidOutputError('schema_parse');
        throw new ProviderError('Job provider request failed', false);
      }
    },
  };
}
export function jobpostPrices() {
  const env = getEnv();
  return {
    input: env.JOBPOST_PRICE_INPUT_PER_MTOK,
    output: env.JOBPOST_PRICE_OUTPUT_PER_MTOK,
    cachedInput:
      env.JOBPOST_PROVIDER === 'openai' && env.JOBPOST_MODEL === env.CHAT_MODEL
        ? env.PRICE_CACHED_INPUT_PER_MTOK
        : env.JOBPOST_PRICE_INPUT_PER_MTOK,
  };
}
