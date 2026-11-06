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
  type InvalidOutputReason,
  type LlmFinishReason,
} from '@/lib/llm/provider';
import { FeedbackLlmSchema, type Feedback } from './schema';
import { normalizeFeedback } from './normalize';

/** Fixed codes/counts only: no answer, provider message or model output. */
export type FeedbackAttempt = {
  attempt: number;
  outcome: 'valid' | 'invalid' | 'provider_error' | 'timeout';
  invalidReason: InvalidOutputReason | null;
  finishReason: LlmFinishReason | null;
  usage: LlmUsage | null;
  latencyMs: number;
};

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
  onAttempt?: (attempt: FeedbackAttempt) => void;
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
    const attemptStart = now();
    let attemptUsage: LlmUsage | null = null;
    let finishReason: LlmFinishReason | null = null;
    const report = (
      outcome: FeedbackAttempt['outcome'],
      invalidReason: InvalidOutputReason | null = null,
    ) => {
      if (attemptUsage) {
        usage.inputTokens += attemptUsage.inputTokens;
        usage.outputTokens += attemptUsage.outputTokens;
        usage.cachedInputTokens += attemptUsage.cachedInputTokens;
      }
      args.onAttempt?.({
        attempt: attempts,
        outcome,
        invalidReason,
        finishReason,
        usage: attemptUsage,
        latencyMs: Math.max(0, now() - attemptStart),
      });
    };
    try {
      const response = await args.provider.generateStructured({
        schema: FeedbackLlmSchema,
        schemaName: selectedPrompt.schemaName,
        system: selectedPrompt.system,
        prompt,
        maxOutputTokens: args.maxOutputTokens,
        signal: AbortSignal.timeout(timeout),
      });
      attemptUsage = response.usage;
      finishReason = response.finishReason ?? null;
      const normalized = normalizeFeedback(response.object, {
        transcript,
        words,
        followUp: args.followUpPrompt !== undefined,
      });
      report('valid');
      return { ...normalized, usage, attempts, latencyMs: now() - start };
    } catch (error) {
      if (error instanceof InvalidOutputError) {
        attemptUsage ??= error.usage;
        finishReason ??= error.finishReason;
        report('invalid', error.reason);
        continue;
      }
      report(error instanceof ProviderTimeoutError ? 'timeout' : 'provider_error');
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
