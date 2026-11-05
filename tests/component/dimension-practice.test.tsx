import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useDimensionPractice } from '@/hooks/use-dimension-practice';
import { startSession } from '@/lib/api/client';
import { SessionRecordSchema } from '@/lib/storage/schema';
import { record } from '../fixtures/records';
import type { StartResponse } from '@/lib/api/contracts';
const mocks = vi.hoisted(() => ({ push: vi.fn(), createSession: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/use-repository', () => ({
  useRepository: () => ({ createSession: mocks.createSession }),
}));
vi.mock('@/lib/api/client', () => ({ startSession: vi.fn() }));
const response: StartResponse = {
  sessionId: record.id,
  seed: record.seed,
  bankVersion: record.bankVersion,
  questions: record.questions,
  token: null,
  tokenExpiresAt: null,
  feedback: { enabled: false, reason: 'practice' },
  limits: { sessionsPerDay: 3, feedbackPerDay: 20, globalDaily: 150 },
  demoMode: 'on',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createSession.mockResolvedValue(undefined);
});
it('TC-151 one click stores focused setup and prevents duplicate starts', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.mocked(startSession).mockImplementation(async () => {
    await gate;
    return { ok: true, data: response };
  });
  const { result } = renderHook(() => useDimensionPractice(record.setup));
  let pending: Promise<void> = Promise.resolve();
  act(() => {
    pending = result.current.start('impact');
    void result.current.start('impact');
  });
  expect(result.current.pending).toBe(true);
  expect(startSession).toHaveBeenCalledTimes(1);
  await act(async () => {
    release();
    await pending;
  });
  expect(startSession).toHaveBeenCalledWith(
    expect.objectContaining({
      dimension: 'impact',
      role: record.setup.role,
      seniority: record.setup.seniority,
      length: 3,
    }),
  );
  expect(SessionRecordSchema.parse(mocks.createSession.mock.calls[0]?.[0]).setup).toMatchObject({
    dimension: 'impact',
    length: 3,
  });
  expect(mocks.push).toHaveBeenCalledWith(`/session/${record.id}`);
  expect(result.current.pending).toBe(false);
});
it('TC-151 quota/network/storage errors keep report available and permit retry', async () => {
  const { result } = renderHook(() => useDimensionPractice(record.setup));
  vi.mocked(startSession).mockResolvedValue({
    ok: false,
    kind: 'http',
    status: 429,
    error: { code: 'SESSION_QUOTA_EXCEEDED', message: 'quota', requestId: 'test' },
  });
  await act(() => result.current.start('clarity'));
  expect(result.current.error).toContain('allowance');
  vi.mocked(startSession).mockResolvedValue({ ok: false, kind: 'network' });
  await act(() => result.current.start('clarity'));
  expect(result.current.error).toContain('Try again');
  vi.mocked(startSession).mockResolvedValue({ ok: true, data: response });
  mocks.createSession.mockRejectedValueOnce(new Error('storage'));
  await act(() => result.current.start('clarity'));
  expect(result.current.error).toContain('Try again');
  expect(mocks.push).not.toHaveBeenCalled();
  await act(() => result.current.start('clarity'));
  expect(result.current.error).toBeNull();
  expect(mocks.push).toHaveBeenCalled();
});
