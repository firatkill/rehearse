import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-042 E2E-29 unknown session offers recovery', async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto(`/session/${crypto.randomUUID()}`);
  await expect(page.getByRole('heading', { name: 'Session not found' })).toBeFocused();
  await expect(
    page.getByText(
      'This session isn’t saved in this browser. Sessions live only in the browser where they were created.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a new session' })).toHaveAttribute(
    'href',
    '/setup',
  );
  await expect(page.getByRole('link', { name: 'Open history', exact: true })).toHaveAttribute(
    'href',
    '/history',
  );
});
