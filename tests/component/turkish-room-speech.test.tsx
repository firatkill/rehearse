/* eslint-disable @typescript-eslint/unbound-method -- Speech methods are test mocks. */
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { useInterviewRoom } from '@/hooks/use-interview-room';
import { record } from '../fixtures/records';
const memory = vi.hoisted(() => ({
  current: null as ReturnType<typeof createMemoryRepository> | null,
}));
vi.mock('@/hooks/use-repository', () => ({
  useRepository: () => memory.current,
  switchToMemoryRepository: () => memory.current,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
it('TC-209 a resumed Turkish session with only English voices skips reading and keeps text mode available', async () => {
  const repo = createMemoryRepository();
  memory.current = repo;
  await repo.createSession({
    ...record,
    setup: { ...record.setup, language: 'tr', mode: 'text', readAloud: true, voiceURI: 'english' },
    feedback: { enabled: false, reason: 'practice' },
  });
  vi.mocked(window.speechSynthesis.getVoices).mockReturnValue([
    { name: 'English', lang: 'en-US', voiceURI: 'english', localService: true, default: true },
  ]);
  const view = renderHook(() => useInterviewRoom(record.id));
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    view.result.current.send({ type: 'START_INTERVIEW' });
    await Promise.resolve();
  });
  expect(view.result.current.state.phase.kind).toBe('thinking');
  expect(view.result.current.readAloudError).toBe(true);
  expect(
    vi
      .mocked(window.speechSynthesis.speak)
      .mock.calls.every(([utterance]) => utterance.text.trim() === ''),
  ).toBe(true);
  act(() => {
    view.result.current.send({ type: 'TYPE_INSTEAD' });
  });
  expect(view.result.current.state.mode).toBe('text');
  view.unmount();
});
