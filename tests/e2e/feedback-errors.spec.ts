import { expect, test } from '@playwright/test';
import { scenarios, serverUrl, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';

test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto(`${serverUrl(info, 0)}/setup`);
  await page.getByLabel('Text: type your answers').check();
  await page.getByLabel('3 questions').check();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
});
for (const trigger of ['provider-error', 'timeout', 'invalid'])
  test(`TC-080 E2E-11 mock:${trigger} retries then saves without feedback`, async ({ page }) => {
    await page.getByLabel('Your answer').fill(`mock:${trigger} I led the project.`);
    await page.getByRole('button', { name: 'Review answer' }).click();
    await page.getByRole('button', { name: 'Get feedback' }).click();
    await expect(page.getByRole('heading', { name: 'Feedback didn’t arrive' })).toBeVisible();
    await expect(page.getByText(/You have 1 retries left in this session/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText(/You have no spare retries left/)).toBeVisible();
    await page.getByRole('button', { name: 'Save without feedback' }).click();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
  });
test('TC-080 E2E-11 slow progress preserves readonly answer; invalid-once succeeds', async ({
  page,
}) => {
  await page.getByLabel('Your answer').fill('mock:slow I led the project.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Get feedback' }).click();
  await expect(page.getByText('Reading your answer…', { exact: true }).last()).toBeVisible();
  await expect(page.getByLabel('Your answer')).toHaveAttribute('readonly');
  await page.clock.runFor(2000);
  await expect(page.getByText('Scoring six dimensions…')).toBeVisible();
  // TRD §25.4 allows the deliberate mock:slow 4-second response up to 6 seconds.
  await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeFocused({
    timeout: 6000,
  });
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('mock:invalid-once I improved the project.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Get feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Feedback on question 2' })).toBeFocused();
});
test('TC-080 FR-26 network failure retains answer and permits retry', async ({ page }) => {
  await page.getByLabel('Your answer').fill('I delivered the project.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.route('**/api/feedback', (route) => route.abort());
  await page.getByRole('button', { name: 'Get feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Connection lost' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  await page.unroute('**/api/feedback');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeFocused();
});
