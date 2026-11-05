import { expect, test } from '@playwright/test';
import { installSpeechMock } from '../e2e/speech-mock';
import { scenarios, uniqueIp } from '../e2e/helpers';
import { auditV6, reducedMotionV6 } from '../e2e/v6-audit-helpers';
for (const theme of ['light', 'dark'] as const) {
  for (const width of [360, 768, 1440, 1920]) {
    test(`TC-191 demo public pages ${theme} ${width}`, async ({ page }, info) => {
      await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
      await page.addInitScript(installSpeechMock, scenarios.noRecognition);
      await page.addInitScript((value) => {
        localStorage.setItem('rehearse-theme', value);
      }, theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        '/',
        '/setup',
        '/sample',
        '/how-it-works',
        '/privacy',
        '/job/northwind-pay',
        '/job/cedar-tools',
        '/job/harbour-health',
      ]) {
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        await auditV6(page);
        await reducedMotionV6(page);
        if (path === '/job/northwind-pay')
          await page.screenshot({ path: `.git/v50-demo-${theme}-${width}.png`, fullPage: true });
      }
    });
  }
}
