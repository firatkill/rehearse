import 'server-only';
import { INVALID_OUTPUT_REASONS, LLM_FINISH_REASONS } from '@/lib/config';
import type { z } from 'zod';

export type LlmUsage = { inputTokens: number; outputTokens: number; cachedInputTokens: number };

export type InvalidOutputReason = (typeof INVALID_OUTPUT_REASONS)[number];
export type LlmFinishReason = (typeof LLM_FINISH_REASONS)[number];
export function safeFinishReason(value: unknown): LlmFinishReason | null {
  return LLM_FINISH_REASONS.find((reason) => reason === value) ?? null;
}

export interface LlmProvider {
  readonly modelId: string;
  generateStructured<T>(args: {
    schema: z.ZodType<T>;
    schemaName: string;
    system: string;
    prompt: string;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): Promise<{ object: T; usage: LlmUsage; finishReason?: LlmFinishReason }>;
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
export class InvalidOutputError extends Error {
  constructor(
    readonly reason: InvalidOutputReason = 'schema_parse',
    readonly usage: LlmUsage | null = null,
    readonly finishReason: LlmFinishReason | null = null,
  ) {
    super('Invalid model output');
  }
}
