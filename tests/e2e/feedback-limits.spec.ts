import { expect, test } from '@playwright/test';
import { apiStart, apiFeedback, expectError } from './api-helpers';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
import { startTextSession } from './storage-helpers';

test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
});
test('TC-109 TC-164 D-80 full has no session IP quota', async ({ page }, info) => {
  for (let n = 0; n < 5; n++) await apiStart(page, info);
  await page.goto('/setup');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ready when you are' })).toBeVisible();
});
test('TC-109 E2E-12 token permits length plus two calls then rejects', async ({ page }, info) => {
  const session = await apiStart(page, info);
  for (let n = 0; n < 7; n++) expect((await apiFeedback(page, info, session)).status()).toBe(200);
  await expectError(await apiFeedback(page, info, session), 429, 'SESSION_FEEDBACK_EXHAUSTED');
});
test('TC-109 E2E-12 D-80 full permits the twenty-first visitor feedback call', async ({
  page,
}, info) => {
  let calls = 0;
  for (let n = 0; n < 3; n++) {
    const session = await apiStart(page, info);
    for (let attempt = 0; attempt < 7; attempt++) {
      const response = await apiFeedback(page, info, session);
      calls++;
      expect(response.status()).toBe(200);
    }
  }
  expect(calls).toBe(21);
});
for (const [code, title] of [
  ['FEEDBACK_QUOTA_EXCEEDED', 'You’ve reached today’s feedback limit'],
  ['SESSION_FEEDBACK_EXHAUSTED', 'No feedback attempts left in this session'],
] as const) {
  test(`TC-109 E2E-12 exact UI for ${code}`, async ({ page }, info) => {
    await startTextSession(page, info);
    await page.getByRole('button', { name: 'Start the interview' }).click();
    await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
    await page.getByLabel('Your answer').fill('I led the delivery and checked the result.');
    await page.getByRole('button', { name: 'Review answer' }).click();
    await page.route('**/api/feedback', (route) =>
      route.fulfill({
        status: 429,
        json: {
          error: {
            code,
            message: code,
            requestId: 'quota-test-reference',
            resetAt: '2026-10-24T00:00:00Z',
          },
        },
      }),
    );
    try {
      await page.getByRole('button', { name: 'Get feedback' }).click();
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(
        code === 'FEEDBACK_QUOTA_EXCEEDED'
          ? page.getByRole('heading', { name: title })
          : page.getByRole('button', { name: 'Save without feedback' }),
      ).toBeFocused();
      await page.getByRole('button', { name: 'Save without feedback' }).click();
      await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
    } finally {
      await page.unroute('**/api/feedback');
    }
  });
}
