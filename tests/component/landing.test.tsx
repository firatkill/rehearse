import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Home from '@/app/page';
import sample from '@/content/sample/session.json';
it('TC-138 V-12 landing uses the committed sample and honest rollout copy', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Rehearse the interview before you have it.',
  );
  expect(screen.getByRole('link', { name: 'Start practising' })).toHaveAttribute('href', '/setup');
  expect(screen.getByRole('link', { name: 'See a sample report' })).toHaveAttribute(
    'href',
    '/sample',
  );
  expect(screen.getByText(sample.session.questions[0]!.prompt)).toBeVisible();
  expect(screen.getByText(sample.answers[0]!.feedback.improvements[0]!.point)).toBeVisible();
  expect(
    screen.getByText(/Job-post interviews, retries and Turkish are coming next/),
  ).toBeVisible();
});
