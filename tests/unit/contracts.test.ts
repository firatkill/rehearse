import { expect, it, vi } from 'vitest';
import type { z } from 'zod';
import * as contracts from '@/lib/api/contracts';
import { FeedbackLlmSchema } from '@/lib/feedback/schema';
import { SummaryLlmSchema } from '@/lib/summary/schema';
import { getBank } from '@/lib/questions/bank';
import { toSnapshot } from '@/lib/questions/schema';
import { startSession, requestFeedback, requestSummary } from '@/lib/api/client';
import { feedback, summary, sessionId, startBody } from '../fixtures/api';

const scores = { structure: 3, specificity: 3, ownership: 3, impact: 3, relevance: 3, clarity: 3 };
const feedbackBody = {
  sessionId,
  answerIndex: 0,
  questionId: 'beh-001',
  mode: 'text' as const,
  transcript: 'I rebuilt the queue to reduce retries.',
};
const summaryBody = {
  sessionId,
  items: [
    {
      answerIndex: 0,
      questionId: 'beh-001',
      scores,
      improvementPoints: ['Quantify the result'],
      flags: feedback.flags,
    },
  ],
};
const startResponse = {
  sessionId,
  seed: '1234abcd',
  bankVersion: '1.0.0',
  questions: getBank().questions.slice(0, 3).map(toSnapshot),
  token: null,
  tokenExpiresAt: null,
  feedback: { enabled: false, reason: 'practice' },
  limits: { sessionsPerDay: 3, feedbackPerDay: 20, globalDaily: 150 },
  demoMode: 'on',
};
const meta = {
  model: 'mock',
  promptVersion: 'feedback-v1',
  latencyMs: 10,
  usage: { inputTokens: 100, outputTokens: 100 },
  costUsd: 0,
};
const feedbackResponse = {
  feedback,
  meta: { ...meta, bankVersion: '1.0.0', attempts: 1, evidenceRemoved: 0 },
  remaining: { session: 4, visitorToday: 19 },
};
const summaryResponse = { summary, meta: { ...meta, promptVersion: 'summary-v1' } };
const errorResponse = {
  error: {
    code: 'SESSION_QUOTA_EXCEEDED',
    message: 'SESSION_QUOTA_EXCEEDED',
    requestId: 'request-id',
    resetAt: '2026-10-22T00:00:00.000Z',
  },
};
const examples: [string, z.ZodType, Record<string, unknown>][] = [
  ['start request', contracts.StartRequestSchema, startBody],
  ['feedback request', contracts.FeedbackRequestSchema, feedbackBody],
  ['summary request', contracts.SummaryRequestSchema, summaryBody],
  ['start response', contracts.StartResponseSchema, startResponse],
  ['feedback response', contracts.FeedbackResponseSchema, feedbackResponse],
  ['summary response', contracts.SummaryResponseSchema, summaryResponse],
  ['error', contracts.ErrorBodySchema, errorResponse],
  [
    'health',
    contracts.HealthResponseSchema,
    {
      status: 'ok',
      version: '1.0.0',
      commit: 'a1b2c3d',
      demoMode: 'on',
      llmMode: 'live',
      rateLimitBackend: 'upstash',
      promptVersions: { feedback: 'feedback-v1', summary: 'summary-v1' },
      bankVersion: '1.0.0',
      time: '2026-11-02T10:00:00.000Z',
    },
  ],
];
// Visit each nested object, so strictness is checked below the envelope too (D-53).
function withUnknowns(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    const array: unknown[] = value;
    return array.flatMap((item, i) =>
      withUnknowns(item).map((changed) =>
        array.map((original, j) => (i === j ? changed : original)),
      ),
    );
  }
  if (value === null || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  return [
    { ...object, unexpected: true },
    ...Object.entries(object).flatMap(([key, item]) =>
      withUnknowns(item).map((changed) => ({ ...object, [key]: changed })),
    ),
  ];
}
it.each(examples)(
  'TC-028 UT-31 accepts the %s example and rejects unknown keys',
  (_name, schema, example) => {
    expect(schema.safeParse(example).success).toBe(true);
    for (const changed of withUnknowns(example))
      expect(schema.safeParse(changed).success).toBe(false);
  },
);
it('TC-028 UT-31 validates request bounds and the initial loose/strict feedback scaffolding', () => {
  const defaultRequest: Record<string, unknown> = { ...startBody };
  delete defaultRequest.feedback;
  expect(contracts.StartRequestSchema.parse(defaultRequest).feedback).toBe(true);
  expect(
    contracts.StartRequestSchema.safeParse({ ...startBody, types: ['behavioral', 'behavioral'] })
      .success,
  ).toBe(false);
  expect(contracts.StartRequestSchema.safeParse({ ...startBody, length: 4 }).success).toBe(false);
  expect(
    contracts.FeedbackRequestSchema.safeParse({ ...feedbackBody, transcript: 'x'.repeat(6001) })
      .success,
  ).toBe(false);
  expect(FeedbackLlmSchema.safeParse(feedback).success).toBe(true);
  expect(
    SummaryLlmSchema.safeParse({
      ...summary,
      focus_notes: [{ dimension: 'impact', note: 'State a result.' }],
    }).success,
  ).toBe(true);
  expect(
    contracts.FeedbackResponseSchema.safeParse({
      ...feedbackResponse,
      feedback: { ...feedback, overall: 5 },
    }).success,
  ).toBe(false);
});
it('TC-028 TRD 12.6 client parses success, HTTP errors, invalid JSON/shapes and network failures', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  fetch.mockResolvedValueOnce(Response.json(startResponse));
  expect(await startSession(startBody)).toEqual({ ok: true, data: startResponse });
  fetch.mockResolvedValueOnce(Response.json(errorResponse, { status: 429 }));
  expect(await startSession(startBody)).toEqual({
    ok: false,
    kind: 'http',
    status: 429,
    error: errorResponse.error,
  });
  for (const response of [
    Response.json({ bad: true }),
    Response.json({ bad: true }, { status: 500 }),
    new Response('{'),
  ]) {
    fetch.mockResolvedValueOnce(response);
    expect(await startSession(startBody)).toEqual({ ok: false, kind: 'invalid-response' });
  }
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  expect(await startSession(startBody)).toEqual({ ok: false, kind: 'network' });
  const timeout = vi.spyOn(AbortSignal, 'timeout');
  fetch.mockResolvedValueOnce(Response.json(feedbackResponse));
  expect((await requestFeedback('signed', feedbackBody)).ok).toBe(true);
  expect(timeout).toHaveBeenCalledWith(55000);
  expect(fetch.mock.lastCall?.[0]).toBe('/api/feedback');
  expect(new Headers(fetch.mock.lastCall?.[1]?.headers).get('authorization')).toBe('Bearer signed');
  const abort = new AbortController();
  abort.abort();
  fetch.mockImplementationOnce((_url, init) => {
    expect(init?.signal?.aborted).toBe(true);
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  });
  expect(await requestFeedback('signed', feedbackBody, abort.signal)).toEqual({
    ok: false,
    kind: 'network',
  });
  fetch.mockResolvedValueOnce(Response.json(summaryResponse));
  expect((await requestSummary('signed', summaryBody, new AbortController().signal)).ok).toBe(true);
});
