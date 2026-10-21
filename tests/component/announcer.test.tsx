import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAnnouncer } from '@/hooks/use-announcer';

it('TC-012 CT-06 clears then announces after 50ms and drops duplicates within one second', () => {
  const { result } = renderHook(useAnnouncer);
  act(() => {
    result.current.announce('Ready');
  });
  expect(result.current.message).toBe('');
  act(() => {
    vi.advanceTimersByTime(50);
  });
  expect(result.current.message).toBe('Ready');
  act(() => {
    result.current.announce('Ready');
    vi.advanceTimersByTime(950);
  });
  expect(result.current.message).toBe('Ready');
  act(() => {
    result.current.announce('Ready');
  });
  expect(result.current.message).toBe('');
  act(() => {
    vi.advanceTimersByTime(50);
  });
  expect(result.current.message).toBe('Ready');
});

it('TC-012 CT-06 enforces interval and keeps only two newest queued messages', () => {
  const { result } = renderHook(useAnnouncer);
  act(() => {
    result.current.announce('First');
    vi.advanceTimersByTime(50);
  });
  act(() => {
    result.current.announce('Dropped');
    result.current.announce('Second');
    result.current.announce('Third');
    vi.advanceTimersByTime(949);
  });
  expect(result.current.message).toBe('First');
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(result.current.message).toBe('');
  act(() => {
    vi.advanceTimersByTime(50);
  });
  expect(result.current.message).toBe('Second');
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(result.current.message).toBe('Third');
});

it('TC-012 CT-06 cancels pending announcements on unmount', () => {
  const { result, unmount } = renderHook(useAnnouncer);
  act(() => {
    result.current.announce('Ready');
    result.current.announce('Later');
  });
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
