import 'server-only';
import type { z } from 'zod';

export type LlmUsage = { inputTokens: number; outputTokens: number; cachedInputTokens: number };

export interface LlmProvider {
  readonly modelId: string;
  generateStructured<T>(args: {
    schema: z.ZodType<T>;
    schemaName: string;
    system: string;
    prompt: string;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): Promise<{ object: T; usage: LlmUsage }>;
}

export class ProviderTimeoutError extends Error {}
export class ProviderError extends Error {
  constructor(
    msg: string,
    readonly retryable: boolean,
  ) {
    super(msg);
  }
}
export class InvalidOutputError extends Error {}
