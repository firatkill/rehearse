import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import HowItWorksPage from '@/app/how-it-works/page';
import PrivacyPage from '@/app/privacy/page';
import { RUBRIC } from '@/lib/feedback/rubric';
it('TC-139 V-13 shows shared rubric anchors and recorded evaluation provenance', async () => {
  render(await HowItWorksPage());
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How it works');
  expect(screen.getByText(RUBRIC.structure.anchors.behavioral[0])).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Read the evaluation result' })).toHaveAttribute(
    'href',
    expect.stringMatching(/eval\/results\/\d{4}-\d{2}-\d{2}(?:-\d+)?\.json$/),
  );
  expect(screen.getByRole('table', { name: 'Evaluation acceptance thresholds' })).toHaveTextContent(
    '95%',
  );
});
it('TC-139 V-13 privacy distinguishes preview and planned editions', () => {
  render(<PrivacyPage />);
  expect(
    screen.getByText('The editions below are planned, not active in this preview.'),
  ).toBeVisible();
  expect(screen.getByText(/recognition sends your audio to Google’s servers/)).toBeVisible();
  expect(screen.getByText(/saved in SQLite on your machine/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'OpenAI’s API data policy' })).toHaveAttribute(
    'href',
    'https://developers.openai.com/api/docs/guides/your-data',
  );
});
