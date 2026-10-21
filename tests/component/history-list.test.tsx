import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { HistoryList } from '@/components/history/history-list';
import { record } from '../fixtures/records';
it('TC-097 CT-08 history empty state and unreadable count match the PRD', () => {
  render(<HistoryList entries={[]} skipped={2} onDelete={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
  expect(screen.getByText('Your sessions will appear here after you start one.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Start a practice session' })).toHaveAttribute(
    'href',
    '/setup',
  );
  expect(screen.getByText('2 saved items couldn’t be read and were skipped.')).toBeVisible();
});
it.each(['completed', 'in_progress', 'ended_early'] as const)(
  'TC-097 CT-08 %s displays labels, score and the correct action',
  (status) => {
    const onDelete = vi.fn();
    render(
      <HistoryList
        entries={[{ session: { ...record, status }, overall: 2.5 }]}
        skipped={0}
        onDelete={onDelete}
      />,
    );
    expect(
      screen.getByText(
        status === 'completed'
          ? 'Finished'
          : status === 'in_progress'
            ? 'In progress'
            : 'Ended early',
      ),
    ).toBeVisible();
    expect(screen.getByText('Backend, Mid-level')).toBeVisible();
    expect(screen.getByText('2.5')).toBeVisible();
    expect(
      screen.getByRole('link', { name: status === 'in_progress' ? 'Resume' : 'Open report' }),
    ).toHaveAttribute('href', `/session/${record.id}${status === 'in_progress' ? '' : '/report'}`);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(record.id);
    expect(screen.queryByText(/saved items couldn’t/)).toBeNull();
  },
);
