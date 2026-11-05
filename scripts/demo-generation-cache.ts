import { createHash } from 'node:crypto';
import { InvalidOutputError, type LlmProvider } from '@/lib/llm/provider';

/** Revalidate legacy cache entries too: raw output is not evidence of successful generation. */
export function withValidatedGenerationCache(options: {
  provider: LlmProvider;
  cache: Record<string, unknown>;
  operation: () => string;
  validate: (value: unknown) => void;
  persist: () => Promise<void>;
  onInvalid: () => Promise<void>;
}): LlmProvider {
  return {
    modelId: options.provider.modelId,
    async generateStructured(args) {
      const key = createHash('sha256')
        .update(options.operation() + args.system + args.prompt + options.provider.modelId)
        .digest('hex');
      if (options.cache[key] !== undefined) {
        try {
          const object = args.schema.parse(options.cache[key]);
          options.validate(object);
          return { object, usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 } };
        } catch {
          Reflect.deleteProperty(options.cache, key);
          await options.persist();
          await options.onInvalid();
        }
      }
      const response = await options.provider.generateStructured(args);
      try {
        args.schema.parse(response.object);
        options.validate(response.object);
      } catch {
        await options.onInvalid();
        throw new InvalidOutputError();
      }
      options.cache[key] = response.object;
      await options.persist();
      return response;
    },
  };
}
