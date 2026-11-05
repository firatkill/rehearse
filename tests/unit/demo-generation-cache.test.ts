import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { withValidatedGenerationCache } from '../../scripts/demo-generation-cache';
import { generateFeedback } from '@/lib/feedback/generate';
import { normalizeFeedback } from '@/lib/feedback/normalize';
import { FeedbackLlmSchema } from '@/lib/feedback/schema';
import type { LlmProvider } from '@/lib/llm/provider';
import { getBank } from '@/lib/questions/bank';
import { feedbackLlm } from '../fixtures/feedback';

it.each([false, true])(
  'TC-163 invalid output retries the provider (legacy cache: %s)',
  async (legacy) => {
    const invalid = feedbackLlm();
    invalid.scores.structure.score = 5;
    const cache: Record<string, unknown> = {};
    const onInvalid = vi.fn(async () => {});
    const persist = vi.fn(async () => {});
    let calls = 0;
    const raw: LlmProvider = {
      modelId: 'fake',
      async generateStructured(args) {
        await Promise.resolve();
        calls++;
        return {
          object: args.schema.parse(calls === 1 && !legacy ? invalid : feedbackLlm()),
          usage: { inputTokens: 10, outputTokens: 20, cachedInputTokens: 0 },
        };
      },
    };
    const transcript = 'I delivered the project. ' + 'measurable '.repeat(40);
    const provider = withValidatedGenerationCache({
      provider: raw,
      cache,
      operation: () => 'feedback:test:strong',
      persist,
      onInvalid,
      validate: (value) => {
        normalizeFeedback(FeedbackLlmSchema.parse(value), { transcript, words: 44 });
      },
    });
    const seeded: LlmProvider = {
      modelId: provider.modelId,
      async generateStructured(args) {
        if (legacy && calls === 0) {
          const key = createHash('sha256')
            .update('feedback:test:strong' + args.system + args.prompt + 'fake')
            .digest('hex');
          cache[key] = invalid;
        }
        return provider.generateStructured(args);
      },
    };
    const result = await generateFeedback({
      question: getBank().questions[0]!,
      role: 'backend',
      seniority: 'mid',
      mode: 'text',
      transcript,
      provider: seeded,
      maxOutputTokens: 900,
    });
    expect(calls).toBe(legacy ? 1 : 2);
    expect(result.attempts).toBe(legacy ? 1 : 2);
    expect(result.feedback.overall).toBe(4);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(Object.values(cache)).toHaveLength(1);
    expect(Object.values(cache)[0]).toMatchObject({ scores: { structure: { score: 4 } } });
    const before = calls;
    await generateFeedback({
      question: getBank().questions[0]!,
      role: 'backend',
      seniority: 'mid',
      mode: 'text',
      transcript,
      provider,
      maxOutputTokens: 900,
    });
    expect(calls).toBe(before);
  },
);
