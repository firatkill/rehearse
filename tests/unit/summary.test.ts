import { expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { generateSummary } from '@/lib/summary/generate';
import { ProviderError, ProviderTimeoutError, type LlmProvider } from '@/lib/llm/provider';
import { DIMENSIONS, LLM } from '@/lib/config';
import type { SummaryRequest } from '@/lib/api/contracts';
const items: SummaryRequest['items'] = [
  {
    answerIndex: 0,
    questionId: 'beh-001',
    scores: { structure: 1, specificity: 2, ownership: 3, impact: 4, relevance: 4, clarity: 4 },
    improvementPoints: ['State your contribution.'],
    flags: { off_topic: false, too_short: false, injection_suspected: false },
  },
];
const output = () => ({
  headline: 'A clearer structure.',
  paragraph: 'You described your work. Explain the result.',
  focus_notes: [
    { dimension: 'ownership', note: 'Own the action.' },
    { dimension: 'unknown', note: 'Ignore this.' },
    { dimension: 'structure', note: 'First structure.' },
    { dimension: 'structure', note: 'Second structure.' },
  ],
  next_practice: 'Practise a shorter opening.',
});
function fake(value: unknown) {
  const calls: Parameters<LlmProvider['generateStructured']>[0][] = [];
  const provider: LlmProvider = {
    modelId: 'fake',
    async generateStructured<T>(
      args: Parameters<LlmProvider['generateStructured']>[0] & { schema: z.ZodType<T> },
    ) {
      await Promise.resolve();
      calls.push(args);
      if (value instanceof Error) throw value;
      return {
        object: value as T,
        usage: { inputTokens: 10, outputTokens: 20, cachedInputTokens: 2 },
      };
    },
  };
  return { provider, calls };
}
const run = (provider: LlmProvider, input = items) =>
  generateSummary({
    items: input,
    role: 'backend',
    seniority: 'mid',
    provider,
    maxOutputTokens: 400,
    now: () => new Date('2026-10-21T12:00:00Z').getTime(),
  });
it('TC-082 UT-26 recomputes aggregates, orders notes, drops unknowns and retains first match', async () => {
  const { provider, calls } = fake(output());
  const result = await run(provider);
  expect(result.summary.focus_notes).toEqual([
    { dimension: 'structure', note: 'First structure.' },
    { dimension: 'specificity', note: null },
    { dimension: 'ownership', note: 'Own the action.' },
  ]);
  expect(result.summary).toMatchObject({
    generated_at: '2026-10-21T12:00:00.000Z',
    model: 'fake',
    prompt_version: 'summary-v1',
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.prompt).toContain('overall_by_question: 3.0');
  expect(calls[0]?.prompt).toContain('focus_areas: structure, specificity, ownership');
  expect(result.usage.inputTokens).toBe(10);
});
it('TC-082 UT-26 clamps text and maps scores in index order using the shared aggregate function', async () => {
  const value = output();
  value.headline = '*'.repeat(600) + 'A useful headline';
  const { provider, calls } = fake(value);
  const other = {
    ...items[0]!,
    answerIndex: 2,
    questionId: 'beh-003',
    scores: Object.fromEntries(
      DIMENSIONS.map((d) => [d, 4]),
    ) as SummaryRequest['items'][number]['scores'],
  };
  const result = await run(provider, [other, ...items]);
  expect(result.summary.headline).toBe('A useful headline');
  expect(calls[0]?.prompt).toContain('overall_by_question: 3.0, 4.0');
  expect(calls[0]?.prompt).toContain('trend: rising');
});
it.each(['headline', 'paragraph', 'next_practice'] as const)(
  'TC-082 UT-26 rejects empty %s without retry',
  async (field) => {
    const value = output();
    value[field] = '  ';
    const { provider, calls } = fake(value);
    await expect(run(provider)).rejects.toMatchObject({ code: 'FEEDBACK_INVALID' });
    expect(calls).toHaveLength(1);
  },
);
it.each([
  [new ProviderError('private', true), 'PROVIDER_ERROR'],
  [new ProviderTimeoutError(), 'PROVIDER_TIMEOUT'],
  [{}, 'FEEDBACK_INVALID'],
] as const)('TC-082 UT-26 maps a single failure safely', async (value, code) => {
  const { provider, calls } = fake(value);
  await expect(run(provider)).rejects.toMatchObject({ code });
  expect(calls).toHaveLength(1);
});
it('TC-082 UT-26 uses the summary timeout and output-token budget', async () => {
  const timeout = vi.spyOn(AbortSignal, 'timeout');
  const { provider, calls } = fake(output());
  await run(provider);
  expect(timeout).toHaveBeenCalledWith(LLM.SUMMARY_TIMEOUT_MS);
  expect(calls[0]?.maxOutputTokens).toBe(400);
  timeout.mockRestore();
});
