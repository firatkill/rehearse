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

test.use({ locale: 'tr-TR' });

for (const saved of ['light', 'dark'] as const) {
  test(`TC-125 V-02 ${saved} theme survives reload and Turkish sample navigation without script warnings`, async ({
    page,
  }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' || /script tag while rendering/i.test(message.text())) {
        errors.push(message.text());
      }
    });
    await page.addInitScript(() => {
      requestAnimationFrame(() => {
        Object.defineProperty(window, 'firstTheme', {
          value: document.documentElement.getAttribute('data-theme'),
        });
      });
    });
    const opposite = saved === 'light' ? 'dark' : 'light';
    await page.emulateMedia({ colorScheme: opposite });
    await page.goto('/setup');
    await page.getByRole('button', { name: `Switch to ${saved} theme` }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', saved);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, 'firstTheme') as unknown))
      .toBe(saved);
    await expect(page.locator('html')).toHaveCSS('color-scheme', saved);
    await page.getByRole('link', { name: 'Sample report', exact: true }).click();
    await expect(page).toHaveURL(/\/sample$/);
    await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveCSS('color-scheme', saved);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, 'firstTheme') as unknown))
      .toBe(saved);
    await page.locator('details').first().locator(':scope > summary').click();
    await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
