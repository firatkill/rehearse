import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useReport } from '@/hooks/use-report';
import { useRepository } from '@/hooks/use-repository';
import { requestSummary } from '@/lib/api/client';
import { answer, record } from '../fixtures/records';
import { feedbackLlm } from '../fixtures/feedback';
beforeEach(() => {
  vi.stubGlobal('indexedDB', undefined);
});
vi.mock('@/lib/api/client', () => ({ requestSummary: vi.fn() }));
it('TC-085 FR-29 calls summary once, persists retryable failure and stops after exhausted quota', async () => {
  vi.setSystemTime(new Date(record.createdAt));
  const repository = useRepository();
  await repository.createSession(record);
  await repository.putAnswer({
    ...answer,
    status: 'scored',
    feedback: { ...feedbackLlm(), overall: 4 },
  });
  vi.mocked(requestSummary)
    .mockResolvedValueOnce({ ok: false, kind: 'network' })
    .mockResolvedValueOnce({
      ok: false,
      kind: 'http',
      status: 429,
      error: {
        code: 'SESSION_SUMMARY_EXHAUSTED',
        message: 'No attempts.',
        requestId: 'request-123',
      },
    });
  const hook = renderHook(() => useReport(record.id));
  await act(async () => {
    await Promise.resolve();
  });
  expect(requestSummary).toHaveBeenCalledTimes(1);
  expect(hook.result.current.canRetry).toBe(true);
  expect((await repository.getSession(record.id))?.summaryStatus).toBe('failed');
  hook.rerender();
  expect(requestSummary).toHaveBeenCalledTimes(1);
  await act(async () => {
    hook.result.current.retry();
    await Promise.resolve();
  });
  expect(requestSummary).toHaveBeenCalledTimes(2);
  expect(hook.result.current.canRetry).toBe(false);
  expect((await repository.getSession(record.id))?.summaryStatus).toBe('unavailable');
  hook.unmount();
});
it('TC-085 FR-29 saved-only and expired sessions never request a summary', async () => {
  const repository = useRepository();
  await repository.createSession({ ...record, tokenExpiresAt: '2000-01-01T00:00:00.000Z' });
  await repository.putAnswer(answer);
  const hook = renderHook(() => useReport(record.id));
  await act(async () => {
    await Promise.resolve();
  });
  expect(requestSummary).not.toHaveBeenCalled();
  expect(hook.result.current.canRetry).toBe(false);
  hook.unmount();
});
