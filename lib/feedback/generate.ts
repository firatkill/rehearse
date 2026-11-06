import 'server-only';
import { LLM, type Role, type Seniority, type AnswerMode, type Language } from '@/lib/config';
import { AppError } from '@/lib/errors';
import type { Question } from '@/lib/questions/schema';
import { countWords } from '@/lib/metrics/words';
import { sanitizeUntrusted } from '@/lib/prompts/sanitize';
import { feedbackPrompt } from '@/lib/prompts/language';
import {
  InvalidOutputError,
  ProviderError,
  ProviderTimeoutError,
  type LlmProvider,
  type LlmUsage,
} from '@/lib/llm/provider';
import { FeedbackLlmSchema, type Feedback } from './schema';
import { normalizeFeedback } from './normalize';

export async function generateFeedback(args: {
  language?: Language;
  question: Question;
  followUpPrompt?: string;
  role: Role;
  seniority: Seniority;
  mode: AnswerMode;
  transcript: string;
  provider: LlmProvider;
  maxOutputTokens: number;
  now?: () => number;
}): Promise<{
  feedback: Feedback;
  usage: LlmUsage;
  attempts: number;
  latencyMs: number;
  evidenceRemoved: number;
}> {
  const transcript = sanitizeUntrusted(args.transcript);
  const words = countWords(transcript);
  if (words === 0) throw new AppError('TRANSCRIPT_EMPTY');
  const now = args.now ?? Date.now;
  const start = now();
  const deadline = start + LLM.FEEDBACK_DEADLINE_MS;
  const selectedPrompt = feedbackPrompt(args.language);
  const prompt = selectedPrompt.build({ ...args, transcript });
  const usage: LlmUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  for (let attempts = 1; attempts <= LLM.FEEDBACK_MAX_ATTEMPTS; attempts++) {
    const timeout = Math.min(LLM.ATTEMPT_TIMEOUT_MS, deadline - now());
    if (timeout <= 0) throw new AppError('PROVIDER_TIMEOUT');
    try {
      const response = await args.provider.generateStructured({
        schema: FeedbackLlmSchema,
        schemaName: selectedPrompt.schemaName,
        system: selectedPrompt.system,
        prompt,
        maxOutputTokens: args.maxOutputTokens,
        signal: AbortSignal.timeout(timeout),
      });
      usage.inputTokens += response.usage.inputTokens;
      usage.outputTokens += response.usage.outputTokens;
      usage.cachedInputTokens += response.usage.cachedInputTokens;
      const normalized = normalizeFeedback(response.object, {
        transcript,
        words,
        followUp: args.followUpPrompt !== undefined,
      });
      return { ...normalized, usage, attempts, latencyMs: now() - start };
    } catch (error) {
      if (error instanceof InvalidOutputError) continue;
      const retry =
        attempts < LLM.FEEDBACK_MAX_ATTEMPTS && deadline - now() >= LLM.MIN_TIME_FOR_RETRY_MS;
      if (error instanceof ProviderError) {
        if (!error.retryable || !retry) throw new AppError('PROVIDER_ERROR');
        await new Promise((resolve) => setTimeout(resolve, LLM.RETRY_BACKOFF_MS));
      } else if (error instanceof ProviderTimeoutError) {
        if (!retry) throw new AppError('PROVIDER_TIMEOUT');
      } else throw error;
    }
  }
  throw new AppError('FEEDBACK_INVALID');
}
