import 'server-only';
import { getEnv } from '@/lib/env';
import { createMockProvider } from './mock';
import { createOpenAiProvider } from './openai';
import type { LlmProvider } from './provider';
export function getProvider(): LlmProvider {
  return getEnv().LLM_MODE === 'mock' ? createMockProvider() : createOpenAiProvider();
}
