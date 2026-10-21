import { expect, test } from '@playwright/test';
import { reportSession } from './report-helpers';
test('TC-085 E2E-20 failed summary leaves local numbers and retry succeeds', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/api/summary', async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'PROVIDER_ERROR', message: 'Unavailable', requestId: 'summary-test' },
        }),
      });
    else await route.continue();
  });
  await reportSession(page, info);
  await expect(
    page.getByText(
      'A written summary isn’t available for this session. The numbers below are calculated from your answers.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('table', { name: 'Scores by question and dimension' })).toBeVisible();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Written by the language model from your scores.')).toBeVisible();
  expect(calls).toBe(2);
});
test('TC-085 E2E-20 exhausted summary quota hides retry and preserves deterministic focus tips', async ({
  page,
}, info) => {
  await page.route('**/api/summary', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'SESSION_SUMMARY_EXHAUSTED',
          message: 'No attempts',
          requestId: 'summary-test',
        },
      }),
    }),
  );
  await reportSession(page, info);
  await expect(
    page.getByText(
      'A written summary isn’t available for this session. The numbers below are calculated from your answers.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Focus on these next' })).toBeVisible();
});
test('TC-085 E2E-20 session without a token never offers summary retry', async ({ page }, info) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/summary')) requests++;
  });
  await reportSession(page, info, false, true);
  await expect(
    page.getByText(
      'A written summary isn’t available for this session. The numbers below are calculated from your answers.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  expect(requests).toBe(0);
});
