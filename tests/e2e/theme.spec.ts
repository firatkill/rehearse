import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-115 E2E-26 system dark and saved theme before first frame', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.addInitScript(() => {
    requestAnimationFrame(() => {
      (window as unknown as { firstTheme: string | null }).firstTheme =
        document.documentElement.getAttribute('data-theme');
    });
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/setup');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { firstTheme: string | null }).firstTheme),
    )
    .toBe('light');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
});
