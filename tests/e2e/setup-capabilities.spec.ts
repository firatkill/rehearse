import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-048 E2E-03 synthesis-only selects Text and disables Voice', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  await expect(
    page.getByText(
      'This browser can read questions aloud but can’t transcribe speech, so you’ll type your answers. For voice answers, use Chrome or Edge.',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Voice: answer out loud')).toBeDisabled();
  await expect(page.getByLabel('Voice: answer out loud')).toHaveAccessibleDescription(
    'Not available in this browser.',
  );
  await expect(page.getByLabel('Text: type your answers')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Check microphone' })).toHaveCount(0);
});
test('TC-048 E2E-03 recognition-only hides voice settings', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, { ...scenarios.happy, synthesis: false });
  await page.goto('/setup');
  await expect(
    page.getByText(
      'This browser can transcribe your answers but can’t read questions aloud. Questions will appear as text.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('group', { name: 'Interviewer voice' })).toHaveCount(0);
  await expect(page.getByLabel('Voice: answer out loud')).toBeChecked();
});
test('TC-047 E2E-03 microphone denial offers text fallback', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.micDenied);
  await page.goto('/setup');
  await page.getByRole('button', { name: 'Check microphone' }).click();
  await expect(
    page.getByText(
      'Microphone access is blocked. Allow it in your browser’s site settings, or choose Text.',
    ),
  ).toBeVisible();
  await page.getByLabel('Text: type your answers').check();
  await expect(page.getByRole('button', { name: 'Check microphone' })).toHaveCount(0);
});
