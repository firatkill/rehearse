import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ProgressOverview } from '@/components/history/progress-overview';
import { HistoryList } from '@/components/history/history-list';
import { entries } from '../fixtures/progress';

test.each([0, 1, 2, 12])(
  'TC-152 Progress supports %i sessions, readable chart data and honest sparse comparisons',
  (count) => {
    const data = entries(count);
    render(
      <>
        <ProgressOverview entries={data} />
        <HistoryList entries={data} skipped={0} onDelete={() => {}} />
      </>,
    );
    expect(
      screen.getByText(
        `${count} sessions · ${count * 3} answers · ${count} min of recorded practice`,
      ),
    ).toBeVisible();
    expect(screen.getByText('Text practice time isn’t measured.')).toBeVisible();
    const dimensions = screen.getByRole('table', { name: 'Dimension averages and change' });
    expect(within(dimensions).getAllByRole('row')).toHaveLength(7);
    if (count === 0) {
      expect(
        screen.getByText('Finish a session with feedback to see your scores here.'),
      ).toBeVisible();
      expect(screen.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
    } else {
      fireEvent.click(screen.getByText('View score table'));
      const table = screen.getByRole('table', { name: 'Overall score by session' });
      expect(within(table).getAllByRole('row')).toHaveLength(Math.min(count, 10) + 1);
      expect(
        within(screen.getByRole('table', { name: 'Practice sessions' })).getAllByRole('row'),
      ).toHaveLength(count + 1);
    }
    if (count < 6)
      expect(
        screen.getByText(
          'Complete six scored sessions to compare the last three with the previous three.',
        ),
      ).toBeVisible();
    else expect(within(dimensions).getAllByText('+2.0')).toHaveLength(6);
    expect(screen.queryByText(/Coming up/)).not.toBeInTheDocument();
  },
);
