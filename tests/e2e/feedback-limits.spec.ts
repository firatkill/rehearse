import { expect, test } from '@playwright/test';
import { apiStart, apiFeedback, expectError, startBody } from './api-helpers';
import { scenarios, serverUrl, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
import { startTextSession } from './storage-helpers';

test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
});
test('TC-109 E2E-12 three session quota and UI practice fallback', async ({ page }, info) => {
  for (let n = 0; n < 3; n++) await apiStart(page, info);
  const origin = serverUrl(info);
  await expectError(
    await page.request.post(`${origin}/api/sessions/start`, {
      headers: { Origin: origin, 'x-real-ip': uniqueIp(info) },
      data: startBody,
    }),
    429,
    'SESSION_QUOTA_EXCEEDED',
  );
  await page.goto('/setup');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'You’ve used today’s feedback sessions' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Practise without feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Ready when you are' })).toBeVisible();
  await expect(
    page.getByText(
      'Feedback is off for this session. You’ll see your transcript and delivery numbers.',
    ),
  ).toBeVisible();
});
test('TC-109 E2E-12 token permits length plus two calls then rejects', async ({ page }, info) => {
  const session = await apiStart(page, info);
  for (let n = 0; n < 7; n++) expect((await apiFeedback(page, info, session)).status()).toBe(200);
  await expectError(await apiFeedback(page, info, session), 429, 'SESSION_FEEDBACK_EXHAUSTED');
});
test('TC-109 E2E-12 visitor feedback quota rejects the twenty-first call', async ({
  page,
}, info) => {
  let calls = 0;
  for (let n = 0; n < 3; n++) {
    const session = await apiStart(page, info);
    for (let attempt = 0; attempt < 7; attempt++) {
      const response = await apiFeedback(page, info, session);
      calls++;
      if (calls <= 20) expect(response.status()).toBe(200);
      else await expectError(response, 429, 'FEEDBACK_QUOTA_EXCEEDED');
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
    await page.getByRole('button', { name: 'Start answering now' }).click();
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
