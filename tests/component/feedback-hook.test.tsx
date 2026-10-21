import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useInterviewRoom } from '@/hooks/use-interview-room';
import { useRepository } from '@/hooks/use-repository';
import { requestFeedback } from '@/lib/api/client';
import { record } from '../fixtures/records';
import { feedbackLlm } from '../fixtures/feedback';
// These component cases exercise the memory repository; IndexedDB lifecycle has UT-12–14 coverage.
beforeEach(() => {
  vi.stubGlobal('indexedDB', undefined);
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/lib/api/client', () => ({ requestFeedback: vi.fn() }));
async function atReview() {
  vi.setSystemTime(new Date(record.createdAt));
  const repositoryHook = renderHook(() => useRepository());
  const repo = repositoryHook.result.current;
  repositoryHook.unmount();
  await repo.createSession(record);
  const hook = renderHook(() => useInterviewRoom(record.id));
  await act(async () => {
    await Promise.resolve();
  });
  act(() => {
    hook.result.current.send({ type: 'START_INTERVIEW' });
  });
  await act(async () => {
    hook.result.current.send({ type: 'START_ANSWERING', now: Date.now() });
    await Promise.resolve();
  });
  act(() => {
    hook.result.current.send({ type: 'TEXT_REVIEW', transcript: 'I delivered the project.' });
  });
  return { hook, repo };
}
it('TC-079 FR-19 persists submission before requesting and persists scored result before display', async () => {
  const { hook, repo } = await atReview();
  vi.mocked(requestFeedback).mockImplementationOnce(async (_token, body) => {
    expect((await repo.getAnswers(record.id))[0]).toMatchObject({
      status: 'submitted',
      transcript: body.transcript,
    });
    return {
      ok: true,
      data: {
        feedback: { ...feedbackLlm(), overall: 4 },
        meta: {
          model: 'mock',
          promptVersion: 'feedback-v1',
          bankVersion: '1.0.0',
          latencyMs: 50,
          attempts: 1,
          usage: { inputTokens: 100, outputTokens: 350 },
          costUsd: 0,
          evidenceRemoved: 0,
        },
        remaining: { session: 4, visitorToday: 19 },
      },
    };
  });
  await act(async () => {
    hook.result.current.send({ type: 'SUBMIT', now: Date.now() });
    await Promise.resolve();
  });
  expect(hook.result.current.state.phase.kind).toBe('feedback');
  expect((await repo.getAnswers(record.id))[0]).toMatchObject({
    status: 'scored',
    feedbackMeta: { model: 'mock' },
  });
  hook.unmount();
});
it('TC-080 FR-26 unmount aborts the feedback request and ignores its late result', async () => {
  const { hook } = await atReview();
  let signal: AbortSignal | undefined;
  let resolve: ((value: Awaited<ReturnType<typeof requestFeedback>>) => void) | undefined;
  vi.mocked(requestFeedback).mockImplementationOnce((_token, _body, requestSignal) => {
    signal = requestSignal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  await act(async () => {
    hook.result.current.send({ type: 'SUBMIT', now: Date.now() });
    await Promise.resolve();
  });
  expect(signal?.aborted).toBe(false);
  hook.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    resolve?.({ ok: false, kind: 'network' });
    await Promise.resolve();
  });
});
