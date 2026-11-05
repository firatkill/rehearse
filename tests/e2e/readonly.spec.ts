import { expect, test } from '@playwright/test';
import { startTextSession } from './storage-helpers';
import { expectError } from './api-helpers';
import { serverUrl, uniqueIp } from './helpers';
test('TC-111 E2E-14 readonly demo offers practice and refuses feedback', async ({ page }, info) => {
  await startTextSession(page, info, true);
  await expect(
    page.getByText(
      'Feedback is paused on the live demo. You can still practise with voice or text, and the sample report shows what feedback looks like.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Feedback is off for this session. You’ll see your transcript and delivery numbers.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
  await page.getByLabel('Your answer').fill('I completed a practice answer.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await expect(page.getByRole('button', { name: 'Get feedback' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
  const origin = serverUrl(info, 1);
  await expectError(
    await page.request.post(`${origin}/api/feedback`, {
      headers: { Origin: origin, 'x-real-ip': uniqueIp(info) },
      data: {},
    }),
    503,
    'DEMO_READONLY',
  );
  await page.goto(`${origin}/sample`);
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
});
