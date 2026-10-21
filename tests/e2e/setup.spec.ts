import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp, serverUrl } from './helpers';
import { installSpeechMock } from './speech-mock';

test('TC-033 E2E-02 setup defaults, type validation and text mode', async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.happy);
  await page.goto('/setup');
  expect(await page.title()).toBe('Set up a session · Rehearse');
  await expect(page.getByLabel('Full-stack', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Mid-level')).toBeChecked();
  await expect(page.getByLabel('Voice: answer out loud')).toBeChecked();
  await page.getByLabel('Behavioral', { exact: true }).uncheck();
  await page.getByLabel('Technical concepts', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(
    'Choose at least one question type.',
  );
  await expect(page.getByLabel('Behavioral', { exact: true })).toBeFocused();
  await page.getByLabel('Behavioral', { exact: true }).check();
  await page.getByLabel('Text: type your answers').check();
  await page.reload();
  await expect(page.getByLabel('Text: type your answers')).toBeChecked();
});
test('TC-034 E2E-02 readonly and maintenance setup states', async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.happy);
  await page.goto(`${serverUrl(testInfo, 1)}/setup`);
  await expect(page.getByRole('button', { name: 'Start session without feedback' })).toBeVisible();
  await page.goto(`${serverUrl(testInfo, 2)}/setup`);
  await expect(
    page.getByRole('heading', { name: 'The practice room is offline for maintenance' }),
  ).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('TC-055 E2E-02 FR-06 preview voice and speaking rate', async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.happy);
  await page.clock.install();
  await page.goto('/setup');
  await expect(page.getByLabel('Voice', { exact: true })).toBeEnabled();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: 'Preview voice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop preview' }).click();
  await expect(page.getByRole('button', { name: 'Preview voice', exact: true })).toBeVisible();
  await page.getByLabel('Speaking rate').fill('1.2');
  await expect(page.getByText('1.2×', { exact: true })).toBeVisible();
});
