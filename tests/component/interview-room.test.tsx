import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useInterviewRoom } from '@/hooks/use-interview-room';
import { useRepository } from '@/hooks/use-repository';
import { record } from '../fixtures/records';
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
it('TC-040 TRD 11.3 persists drafts, debounces edits and recovers a failed write in memory', async () => {
  const repo = useRepository();
  await repo.createSession({ ...record, feedback: { enabled: false, reason: 'practice' } });
  const view = renderHook(() => useInterviewRoom(record.id));
  await act(async () => {
    await Promise.resolve();
  });
  expect(view.result.current.state.phase.kind).toBe('intro');
  act(() => {
    view.result.current.send({ type: 'START_INTERVIEW' });
  });
  await act(async () => {
    view.result.current.send({ type: 'START_ANSWERING', now: Date.now() });
    await Promise.resolve();
  });
  act(() => {
    view.result.current.onDraft('I improved delivery.');
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect((await repo.getAnswers(record.id))[0]?.transcript).toBe('I improved delivery.');
  act(() => {
    view.result.current.send({ type: 'TEXT_REVIEW', transcript: 'I improved delivery.' });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect((await repo.getAnswers(record.id))[0]?.status).toBe('review');
  act(() => {
    view.result.current.send({ type: 'EDIT', transcript: 'I improved delivery with tests.' });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(499);
  });
  expect((await repo.getAnswers(record.id))[0]?.transcript).toBe('I improved delivery.');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect((await repo.getAnswers(record.id))[0]?.metrics.words).toBe(5);
  const failed = vi.spyOn(repo, 'putAnswer').mockRejectedValueOnce(new Error('write failed'));
  act(() => {
    view.result.current.send({ type: 'SAVE_WITHOUT_FEEDBACK' });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(failed).toHaveBeenCalledOnce();
  const fallback = useRepository();
  expect(fallback).not.toBe(repo);
  expect((await fallback.getAnswers(record.id))[0]?.status).toBe('saved');
  expect(await fallback.getSession(record.id)).not.toBeNull();
  view.unmount();
  failed.mockRestore();
});
