import 'server-only';
import { AppError } from '@/lib/errors';
import { getEnv } from '@/lib/env';
import { createMockProvider } from './mock';
import { createOpenAiProvider } from './openai';
import type { LlmProvider } from './provider';
export function getProvider(): LlmProvider {
  const env = getEnv();
  if (env.APP_EDITION === 'demo') throw new AppError('DEMO_ONLY');
  return env.LLM_MODE === 'mock' ? createMockProvider() : createOpenAiProvider();
}
