import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from 'ai';
import { LLM } from '@/lib/config';
import { getEnv } from '@/lib/env';
import {
  InvalidOutputError,
  ProviderError,
  ProviderTimeoutError,
  type LlmProvider,
} from '@/lib/llm/provider';

export function createOpenAiProvider(): LlmProvider {
  const env = getEnv();
  const modelId = env.CHAT_MODEL;
  if (!modelId || !env.OPENAI_API_KEY)
    throw new ProviderError('Invalid provider configuration', false);
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  return {
    modelId,
    async generateStructured(args) {
      try {
        if (args.signal.aborted) throw new ProviderTimeoutError();
        const result = await generateText({
          model: openai(modelId),
          output: Output.object({ schema: args.schema, name: args.schemaName }),
          instructions: args.system,
          prompt: args.prompt,
          maxOutputTokens: args.maxOutputTokens,
          maxRetries: 0,
          abortSignal: args.signal,
          ...(env.CHAT_MODEL_SUPPORTS_TEMPERATURE ? { temperature: LLM.TEMPERATURE } : {}),
          providerOptions: {
            openai: {
              strictJsonSchema: false,
              ...(env.CHAT_REASONING_EFFORT ? { reasoningEffort: env.CHAT_REASONING_EFFORT } : {}),
            },
          },
        });
        const parsed = args.schema.safeParse(result.output);
        if (!parsed.success) throw new InvalidOutputError();
        return {
          object: parsed.data,
          usage: {
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
            cachedInputTokens: result.usage.inputTokenDetails.cacheReadTokens ?? 0,
          },
        };
      } catch (error) {
        if (
          args.signal.aborted ||
          error instanceof ProviderTimeoutError ||
          (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
        )
          throw new ProviderTimeoutError();
        if (
          error instanceof InvalidOutputError ||
          NoObjectGeneratedError.isInstance(error) ||
          NoOutputGeneratedError.isInstance(error)
        ) {
          throw new InvalidOutputError();
        }
        if (APICallError.isInstance(error)) {
          throw new ProviderError(
            'Provider request failed',
            error.statusCode === undefined || error.statusCode === 429 || error.statusCode >= 500,
          );
        }
        throw new ProviderError('Provider request failed', true);
      }
    },
  };
}
