import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProgressHeader } from '@/components/room/progress-header';
import { record } from '../fixtures/records';
it('TC-169 job context replaces generic role; bank sessions retain their context', () => {
  const { rerender } = render(
    <ProgressHeader session={record} index={0} jobLabel="Northwind Pay · Frontend engineer" />,
  );
  expect(screen.getByText('Northwind Pay · Frontend engineer')).toBeVisible();
  expect(document.querySelector('.room-context')).not.toHaveTextContent('Backend');
  rerender(<ProgressHeader session={record} index={0} />);
  expect(document.querySelector('.room-context')).toHaveTextContent('Backend');
});
