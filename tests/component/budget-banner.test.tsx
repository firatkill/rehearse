import { render, screen, cleanup, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BudgetBanner } from '@/components/layout/budget-banner';
import { BUDGET } from '@/lib/config';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('TC-164 TC-212 renders the validated server warning without loading the polling boundary on first paint', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(() =>
    Promise.resolve(Response.json({ month: '2026-11', spentUsd: 5, budgetUsd: 5, level: '100' })),
  );
  vi.stubGlobal('fetch', fetch);
  render(<BudgetBanner initialLevel="80" />);
  expect(screen.getByRole('status')).toHaveTextContent('at least 80%');
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(BUDGET.POLL_MS);
    await vi.dynamicImportSettled();
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status')).toHaveTextContent('Practice remains available');
});
it('TC-164 monthly warning refreshes at 80 and 100 and clears next month', async () => {
  vi.useFakeTimers();
  let level = 'none';
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          month: '2026-11',
          spentUsd: level === 'none' ? 0 : 5,
          budgetUsd: 5,
          level,
        }),
      ),
    ),
  );
  act(() => {
    render(<BudgetBanner />);
  });
  // Effects start after the render act commits; settle the deferred validator afterwards.
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  expect(screen.queryByRole('status')).toBeNull();
  level = '80';
  await act(async () => {
    await vi.advanceTimersByTimeAsync(BUDGET.POLL_MS);
    await vi.dynamicImportSettled();
  });
  expect(screen.getByRole('status')).toHaveTextContent('at least 80%');
  level = '100';
  await act(async () => {
    await vi.advanceTimersByTimeAsync(BUDGET.POLL_MS);
    await vi.dynamicImportSettled();
  });
  expect(screen.getByRole('status')).toHaveTextContent('Practice remains available');
  level = 'none';
  await act(async () => {
    await vi.advanceTimersByTimeAsync(BUDGET.POLL_MS);
    await vi.dynamicImportSettled();
  });
  expect(screen.queryByRole('status')).toBeNull();
});
