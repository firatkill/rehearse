import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { JOBPOST } from '@/lib/config';
import { generateJobQuestions } from '@/lib/jobpost/generate';
import { validateJobQuestions } from '@/lib/jobpost/validate';
import { evaluateJobPosts, JobGoldenSchema } from '@/lib/jobpost/evaluation';
import { JobGenerationSchema } from '@/lib/jobpost/schema';
import { mockJobpostOutput } from '@/lib/jobpost/mock';
import { jobpostUserMessage } from '@/lib/prompts/jobpost';
import { JOBPOST_PROMPT_VERSION } from '@/lib/prompts/version';
import {
  type LlmProvider,
  ProviderError,
  ProviderTimeoutError,
  InvalidOutputError,
} from '@/lib/llm/provider';
import { AppError } from '@/lib/errors';
import { jobText } from '../fixtures/jobpost';
const usage = { inputTokens: 10, outputTokens: 20, cachedInputTokens: 0 };
function provider(transform: (prompt: string) => unknown): LlmProvider {
  return {
    modelId: 'fake',
    async generateStructured(args) {
      await Promise.resolve();
      return { object: args.schema.parse(transform(args.prompt)), usage };
    },
  };
}
const output = (count = 11) =>
  JobGenerationSchema.parse(mockJobpostOutput(jobpostUserMessage(jobText, count)));
const fixtures = (count = 6) =>
  Array.from({ length: count }, (_, i) => ({
    id: `jp-${String(i + 1).padStart(3, '0')}`,
    text: jobText,
    injection: i === 1 || i === 2,
    forbidden: ['PWNED'],
  }));
it('TC-183 spare candidates survive grounding/duplicate drops and retain first accepted order', async () => {
  const raw = output();
  raw.questions[0] = {
    ...raw.questions[0]!,
    groundingQuote: 'Absent requirement never written in this post',
  };
  raw.questions[1] = { ...raw.questions[2]! };
  raw.questions[3] = { ...raw.questions[3]!, groundingQuote: 'team' };
  let prompt = '';
  const result = await generateJobQuestions({
    text: jobText,
    bankQuestions: [],
    provider: provider((p) => {
      prompt = p;
      return raw;
    }),
  });
  expect(prompt).toMatch(/^Return 11 questions/);
  expect(JOBPOST_PROMPT_VERSION).toBe('jobpost-v2');
  expect(result.questions).toEqual([raw.questions[2], ...raw.questions.slice(4)]);
  expect(result.questions).toHaveLength(8);
  expect(result.validation.ungrounded).toBe(2);
  expect(result.validation.duplicates).toBe(1);
  const tooFew = { ...raw, questions: raw.questions.slice(0, -1) };
  await expect(
    generateJobQuestions({ text: jobText, bankQuestions: [], provider: provider(() => tooFew) }),
  ).rejects.toMatchObject({ code: 'JOBPOST_INVALID' });
});
it('TC-183 more requests eight candidates, returns five, and caps larger requests at MAX_CANDIDATES', async () => {
  let prompt = '';
  const fake = provider((p) => {
    prompt = p;
    return mockJobpostOutput(p);
  });
  const result = await generateJobQuestions({
    text: jobText,
    count: 5,
    bankQuestions: [],
    provider: fake,
  });
  expect(prompt).toMatch(/^Return 8 questions/);
  expect(result.questions).toHaveLength(5);
  await expect(
    generateJobQuestions({
      text: jobText,
      count: JOBPOST.MAX_CANDIDATES,
      bankQuestions: [],
      provider: fake,
    }),
  ).rejects.toMatchObject({ code: 'JOBPOST_INVALID' });
  expect(prompt).toMatch(/^Return 16 questions/);
});
it('TC-185 present one-word, short and fewer-than-four-word quotes are rejected after normalisation', () => {
  const first = output().questions[0]!;
  for (const quote of [
    'team',
    'interoperabilityarchitecture',
    'Build safe web apps',
    'Build interoperability systems',
  ]) {
    const result = validateJobQuestions([{ ...first, groundingQuote: quote }], quote, []);
    expect(result.questions).toEqual([]);
    expect(result.groundingRate).toBe(0);
  }
  expect(
    validateJobQuestions(
      [{ ...first, groundingQuote: 'Ｂuild   safe web tools' }],
      'Build safe web tools',
      [],
    ).questions,
  ).toHaveLength(1);
  expect(validateJobQuestions([], jobText, []).groundingRate).toBe(0);
});
it('TC-184 grounding includes discarded candidates rather than only the final eight', async () => {
  const raw = output(10);
  raw.questions[0] = { ...raw.questions[0]!, groundingQuote: 'Never present in any source text' };
  raw.questions[1] = {
    ...raw.questions[1]!,
    groundingQuote: 'Also absent from the source requirements',
  };
  const result = await evaluateJobPosts(
    fixtures(),
    provider(() => raw),
    [],
  );
  expect(result.results.every((item) => item.questionCount === 8 && item.errorCode === null)).toBe(
    true,
  );
  expect(result.grounding).toBeCloseTo(0.8);
  expect(result.passed).toBe(false);
});
it('TC-184 a per-case provider failure is recorded safely and cannot pass even at 0.95 aggregate grounding', async () => {
  let calls = 0;
  const fake = provider((p) => {
    calls++;
    if (calls === 1) throw new ProviderError('sensitive raw provider output', false);
    return mockJobpostOutput(p);
  });
  const result = await evaluateJobPosts(fixtures(20), fake, []);
  expect(calls).toBe(20);
  expect(result.results).toHaveLength(20);
  expect(result.results[0]).toMatchObject({
    groundingRate: 0,
    errorCode: 'PROVIDER_ERROR',
    questionCount: 0,
    usage: null,
  });
  expect(result.results.slice(1).every((item) => item.errorCode === null)).toBe(true);
  expect(result.grounding).toBeCloseTo(0.95);
  expect(result.passed).toBe(false);
  expect(JSON.stringify(result)).not.toContain('sensitive raw provider output');
});
it.each([
  { error: new AppError('JOBPOST_INVALID'), code: 'JOBPOST_INVALID' },
  { error: new InvalidOutputError('invalid'), code: 'JOBPOST_INVALID' },
  { error: new ProviderTimeoutError('late'), code: 'PROVIDER_TIMEOUT' },
  { error: new Error('unknown'), code: 'INTERNAL_ERROR' },
])('TC-184 records $code and continues other fixtures', async ({ error, code }) => {
  let calls = 0;
  const result = await evaluateJobPosts(
    fixtures(),
    provider((p) => {
      if (++calls === 1) throw error;
      return mockJobpostOutput(p);
    }),
    [],
  );
  expect(calls).toBe(6);
  expect(result.results[0]?.errorCode).toBe(code);
  expect(result.results[1]?.errorCode).toBeNull();
  expect(result.passed).toBe(false);
});

it('TC-197 empty about is valid when the source has no company description', async () => {
  const raw = { ...output(), about: '' };
  expect(JobGenerationSchema.parse(raw).about).toBe('');
  const result = await generateJobQuestions({
    text: jobText,
    bankQuestions: [],
    provider: provider(() => raw),
  });
  expect(result.summary.about).toBe('');
  expect(result.questions).toHaveLength(8);
  expect(JobGenerationSchema.safeParse({ ...raw, about: 'x'.repeat(1001) }).success).toBe(false);
  expect(JobGenerationSchema.safeParse({ ...raw, about: null }).success).toBe(false);
  expect(JOBPOST_PROMPT_VERSION).toBe('jobpost-v2');
});

it.each(['Document operational runbooks.', 'Run tests.', 'Deploy safely!', 'Handle incidents?'])(
  'TC-198 complete sentence %s bypasses fragment minima',
  (quote) => {
    const first = output().questions[0]!;
    const text = `Use version 3.4. ${quote} Mentor colleagues.`;
    const result = validateJobQuestions(
      [{ ...first, groundingQuote: quote.toUpperCase().replaceAll(' ', '  ') }],
      text,
      [],
    );
    expect(result.questions).toHaveLength(1);
    expect(result.groundingRate).toBe(1);
  },
);

it('TC-198 short complete runbook sentence is grounded in all six actual golden posts', () => {
  const first = output().questions[0]!;
  for (let index = 1; index <= 6; index++) {
    const raw: unknown = JSON.parse(
      readFileSync(`eval/golden-jobposts/jp-${String(index).padStart(3, '0')}.json`, 'utf8'),
    );
    const fixture = JobGoldenSchema.parse(raw);
    const result = validateJobQuestions(
      [{ ...first, groundingQuote: 'Document operational runbooks.' }],
      fixture.text,
      [],
    );
    expect(result.questions, fixture.id).toHaveLength(1);
    expect(result.groundingRate).toBe(1);
  }
});

it.each([
  ['operational runbooks.', 'Document operational runbooks.'],
  ['Document operational runbooks', 'Document operational runbooks.'],
  ['Document operational runbooks.', 'Help document operational runbooks.'],
  ['Document operational runbooks.', 'Document operational guides.'],
  ['Document operational runbooks', 'Document operational runbooks'],
  ['4.', 'Use version 3.4.'],
  ['...', '...'],
])('TC-198 short fragment or absent sentence %s is still rejected', (quote, text) => {
  const first = output().questions[0]!;
  const result = validateJobQuestions([{ ...first, groundingQuote: quote }], text, []);
  expect(result.questions).toEqual([]);
  expect(result.groundingRate).toBe(0);
});
