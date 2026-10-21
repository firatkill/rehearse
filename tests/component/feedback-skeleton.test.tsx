import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { FeedbackSkeleton } from '@/components/room/feedback-skeleton';
it('TC-080 PRD §9.6 progress changes at 0, 2, 5 and 9 seconds without a live timer', () => {
  const { container, unmount } = render(<FeedbackSkeleton />);
  expect(screen.getByText('Reading your answer…')).toBeVisible();
  for (const [elapsed, text] of [
    [2000, 'Scoring six dimensions…'],
    [3000, 'Writing suggestions…'],
    [4000, 'Almost done…'],
  ] as const) {
    act(() => {
      vi.advanceTimersByTime(elapsed);
    });
    expect(screen.getByText(text)).toBeVisible();
  }
  expect(container.querySelector('[aria-live], [role=status]')).toBeNull();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
