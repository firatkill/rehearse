import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { resetEnvForTests } from '@/lib/env';
import Home from '@/app/page';
afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});
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
it('TC-139 privacy explains shipped full storage and provider policy', async () => {
  render(await PrivacyPage());
  expect(screen.getByText('You are using the full, self-hosted edition.')).toBeVisible();
  expect(screen.getByText(/recognition sends your audio to Google’s servers/)).toBeVisible();
  expect(screen.getByText(/saved in SQLite on your machine/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'OpenAI’s API data policy' })).toHaveAttribute(
    'href',
    'https://developers.openai.com/api/docs/guides/your-data',
  );
});

for (const edition of ['demo', 'full'] as const) {
  it(`TC-203 ${edition} public pages describe shipped storage, AI and browser verification`, async () => {
    vi.stubEnv('APP_EDITION', edition);
    resetEnvForTests();
    const privacy = render(await PrivacyPage());
    expect(
      screen.getByRole('heading', {
        name: edition === 'demo' ? 'What stays in your browser' : 'What stays on your machine',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        edition === 'demo'
          ? /your answer is sent to the demo server to select an example/
          : /The full edition stores sessions, answers, feedback and job posts in SQLite/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        edition === 'demo'
          ? /Use ‘Save without feedback’ to keep a demo answer in this browser/
          : /Use ‘Save without feedback’ to save an answer in local SQLite/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        edition === 'demo'
          ? /has no daily provider quotas/
          : /Monthly budget warnings do not block practice/,
      ),
    ).toBeVisible();
    expect(privacy.container).not.toHaveTextContent(
      /This preview|planned, not active|Upstash Redis/,
    );
    privacy.unmount();
    const how = render(await HowItWorksPage());
    expect(
      screen.getByText(
        edition === 'demo'
          ? /You are using the demo: feedback is pre-written/
          : /You are using the full edition: live feedback/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        edition === 'demo'
          ? /The browser stores sessions, answers and sample feedback in IndexedDB/
          : /The self-hosted server stores sessions, answers, feedback and job posts in SQLite/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /tested on real devices in Chrome and Safari, including VoiceOver in Safari/,
      ),
    ).toBeVisible();
    expect(screen.getByText(/latency has not been formally measured/)).toBeVisible();
    expect(how.container).not.toHaveTextContent(
      /This preview|planned public demo|later milestone|release preview/,
    );
    how.unmount();
    const home = render(await Home());
    expect(screen.getByRole('table', { name: 'Demo and self-hosted editions' })).toBeVisible();
    expect(screen.getByRole('row', { name: /Language/ })).toHaveTextContent('English and Turkish');
    expect(
      screen.getByText(
        edition === 'demo'
          ? /or try one of three example job posts/
          : /paste a job post or link to generate questions grounded in that role/,
      ),
    ).toBeVisible();
    expect(home.container).not.toHaveTextContent(
      /being built|Planned demo|Turkish is coming later|questions are coming/,
    );
  });
}
