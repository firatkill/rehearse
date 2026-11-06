import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import {
  APICallError,
  JSONParseError,
  type LanguageModelUsage,
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from 'ai';
import { LLM } from '@/lib/config';
import { getEnv } from '@/lib/env';
import {
  InvalidOutputError,
  safeFinishReason,
  type LlmUsage,
  ProviderError,
  ProviderTimeoutError,
  type LlmProvider,
} from '@/lib/llm/provider';

function usageOf(usage: LanguageModelUsage | undefined): LlmUsage | null {
  return usage
    ? {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
      }
    : null;
}

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
              strictJsonSchema: args.strictJsonSchema ?? false,
              ...(env.CHAT_REASONING_EFFORT ? { reasoningEffort: env.CHAT_REASONING_EFFORT } : {}),
            },
          },
        });
        const parsed = args.schema.safeParse(result.output);
        if (!parsed.success)
          throw new InvalidOutputError(
            result.finishReason === 'length' ? 'truncated' : 'schema_parse',
            usageOf(result.usage),
            safeFinishReason(result.finishReason),
          );
        return {
          object: parsed.data,
          ...(safeFinishReason(result.finishReason)
            ? { finishReason: safeFinishReason(result.finishReason) ?? 'other' }
            : {}),
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
        if (error instanceof InvalidOutputError) throw error;
        if (NoObjectGeneratedError.isInstance(error)) {
          throw new InvalidOutputError(
            error.finishReason === 'length'
              ? 'truncated'
              : JSONParseError.isInstance(error.cause)
                ? 'json_parse'
                : 'schema_parse',
            usageOf(error.usage),
            safeFinishReason(error.finishReason),
          );
        }
        if (NoOutputGeneratedError.isInstance(error)) throw new InvalidOutputError('no_output');
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
