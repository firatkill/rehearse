import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { resetEnvForTests } from '@/lib/env';
afterEach(() => {
  resetEnvForTests();
});
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
    screen.getByText(
      /Available now: role-based practice, retries and interviews based on your job posts in English. Turkish is coming later./,
    ),
  ).toBeVisible();
});

it('TC-168 demo landing distinguishes examples from future own-post interviews', () => {
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  render(<Home />);
  expect(
    screen.getByText(
      'Available now: role-based practice, retries and example job-post interviews in English. Practise with your own job posts in the self-hosted version; Turkish is coming later.',
    ),
  ).toBeVisible();
});
