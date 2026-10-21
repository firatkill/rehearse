import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-087 E2E-21 sample has a fictional banner, complete report and zero API calls', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const calls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url());
  });
  await page.goto('/sample');
  await expect(page).toHaveTitle('Sample report · Rehearse');
  await expect(
    page.getByText(
      'This is a sample session with answers written for the demo. The candidate is fictional. No language model was called to show this page.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await expect(page.getByText(/3\/3 answered/)).toBeVisible();
  await expect(page.getByRole('table', { name: 'Scores by question and dimension' })).toBeVisible();
  await expect(page.getByText('Written by the language model from your scores.')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start a practice session', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Practise again with the same questions' }),
  ).toHaveCount(0);
  await page.locator('details').first().locator(':scope > summary').click();
  await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  expect((await download).suggestedFilename()).toContain('full-stack.md');
  expect(calls).toEqual([]);
});
