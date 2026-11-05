import { expect, it, vi } from 'vitest';
import { demoFeedback, demoJobs } from '@/lib/demo/content';
import { sampleFeedback, getFeedbackSource } from '@/lib/demo/source';
import { resetEnvForTests } from '@/lib/env';
import { getInterviewBank } from '@/lib/demo/catalog';
import { selectQuestions } from '@/lib/questions/select';
import { ROLES, SENIORITIES, QUESTION_TYPES } from '@/lib/config';
it('TC-162 demo corpus covers selection and strips unmatched evidence', () => {
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  try {
    expect(getFeedbackSource().modelId).toBe('sample');
    const bank = getInterviewBank();
    for (const role of ROLES)
      for (const seniority of SENIORITIES)
        for (const type of QUESTION_TYPES)
          expect(
            selectQuestions(bank.questions, {
              role,
              seniority,
              types: [type],
              length: 5,
              seed: '12345678',
            }),
          ).toHaveLength(5);
    const entry = demoFeedback[0]!;
    const previous = structuredClone(entry.variants);
    try {
      for (const variant of entry.variants)
        variant.feedback.strengths[0]!.evidence = 'This exact phrase is absent from the answer';
      const result = sampleFeedback(entry.questionId, 'I improved delivery by 25 percent.');
      expect(result.feedback.strengths.every((s) => s.evidence === null)).toBe(true);
      expect(result.evidenceRemoved).toBeGreaterThan(0);
      expect(result.usage.inputTokens).toBe(0);
    } finally {
      entry.variants = previous;
    }
    expect(demoJobs).toHaveLength(3);
  } finally {
    resetEnvForTests();
  }
});
it('TC-162 unknown demo question cannot obtain sample feedback', () => {
  expect(() => sampleFeedback('missing', 'answer')).toThrow();
});

it('TC-162 demo job starts, returns sample feedback and authorises its follow-up', async () => {
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  try {
    const { POST: start } = await import('@/app/api/sessions/start/route');
    const { POST: feedback } = await import('@/app/api/feedback/route');
    const { StartResponseSchema, FeedbackResponseSchema } = await import('@/lib/api/contracts');
    const headers = { 'Content-Type': 'application/json', origin: 'http://localhost:3000' };
    const session = StartResponseSchema.parse(
      await (
        await start(
          new Request('http://localhost:3000/api/sessions/start', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              role: 'full-stack',
              seniority: 'mid',
              types: ['behavioral'],
              length: 3,
              mode: 'text',
              feedback: true,
              demoJob: 'northwind-pay',
            }),
          }),
        )
      ).json(),
    );
    const body = {
      sessionId: session.sessionId,
      answerIndex: 0,
      questionId: session.questions[0]!.id,
      mode: 'text',
      transcript: 'I measured the result and reduced failures by 20 percent.',
    };
    const response = await feedback(
      new Request('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { ...headers, authorization: `Bearer ${session.token}` },
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(200);
    const result = FeedbackResponseSchema.parse(await response.json());
    expect(result.meta).toMatchObject({ model: 'sample', attempts: 0, costUsd: 0 });
    expect(result.followUpToken).toBeTruthy();
    const followUp = await feedback(
      new Request('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { ...headers, authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ ...body, followUpToken: result.followUpToken }),
      }),
    );
    expect(followUp.status).toBe(200);
  } finally {
    resetEnvForTests();
  }
});
