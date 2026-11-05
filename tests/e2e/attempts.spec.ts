import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';

test('TC-146 retry stores two attempts, calls feedback once each and survives reload', async ({
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
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page
      .getByLabel('Your answer', { exact: true })
      .fill(
        `I led attempt ${attempt}: traced the regression, shipped a fix and cut failures by 30 percent.`,
      );
    await page.getByRole('button', { name: 'Review answer', exact: true }).click();
    await page.getByRole('button', { name: 'Get feedback', exact: true }).click();
    await expect(page.getByRole('tab', { name: `Attempt ${attempt}` })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(calls).toBe(attempt);
    if (attempt === 1) {
      await page.getByRole('button', { name: 'Try again with this' }).click();
      await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('');
      expect(calls).toBe(1);
    }
  }
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Attempt 2' })).toBeVisible();
  await page.getByRole('tab', { name: 'Attempt 1' }).click();
  await page.getByText('Your answer', { exact: true }).click();
  await expect(
    page.getByText(
      'I led attempt 1: traced the regression, shipped a fix and cut failures by 30 percent.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again with this' }).click();
  await page.getByLabel('Your answer', { exact: true }).fill('Unfinished third draft');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByText(/2 tries/)).toBeVisible();
  await page.getByText(/Question 1:.*2 tries/).click();
  await page.getByText('Your answer', { exact: true }).click();
  await expect(
    page.getByText(
      'I led attempt 1: traced the regression, shipped a fix and cut failures by 30 percent.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('Unfinished third draft', { exact: true })).toHaveCount(0);
  expect(calls).toBe(2);
});
