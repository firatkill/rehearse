import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-149 follow-up is scored once, retained after reload and listed under its original question', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/feedback') && request.method() === 'POST') calls++;
  });
  await page.goto('/setup');
  await page.getByLabel('Read questions aloud').uncheck();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start now', exact: true }).click();
  await page
    .getByLabel('Your answer', { exact: true })
    .fill('I fixed the delivery queue and checked the result with support.');
  await page.getByRole('button', { name: 'Review answer', exact: true }).click();
  await page.getByRole('button', { name: 'Get feedback', exact: true }).click();
  await page.getByRole('button', { name: 'Answer follow-up', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'What would you do differently next time?',
  );
  await page.getByRole('button', { name: 'Start now', exact: true }).click();
  await page
    .getByLabel('Your answer', { exact: true })
    .fill(
      'I would compare equal time periods and save the baseline metrics before changing the queue.',
    );
  await page.getByRole('button', { name: 'Review answer', exact: true }).click();
  await page.getByRole('button', { name: 'Get feedback', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Follow-up 1' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Answer follow-up', exact: true })).toHaveCount(0);
  expect(calls).toBe(2);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Follow-up 1' })).toBeVisible();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page).toHaveURL(/\/report$/);
  await page.getByText(/Question 1:.*1 try/).click();
  const followUp = page.getByRole('region', { name: 'Follow-up 1', exact: true });
  await expect(followUp).toContainText('I would compare equal time periods');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(calls).toBe(2);
});
