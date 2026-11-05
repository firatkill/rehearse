import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedLocalSession } from './local-session-helpers';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';

for (const theme of ['light', 'dark']) {
  test(`TC-152 Progress 12 sessions has accessible chart table and responsive ${theme} layout`, async ({
    page,
  }, info) => {
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.goto('/progress');
    await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
    for (let i = 0; i < 12; i++) await seedLocalSession(page);
    await page.evaluate((value) => {
      localStorage.setItem('rehearse-theme', value);
    }, theme);
    await page.reload();
    await expect(
      page.getByRole('table', { name: 'Practice sessions' }).locator('tbody tr'),
    ).toHaveCount(12);
    await page.getByText('View score table').click();
    await expect(
      page.getByRole('table', { name: 'Overall score by session' }).locator('tbody tr'),
    ).toHaveCount(10);
    await expect(page.getByText(/Coming up/)).toHaveCount(0);
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
    await page.getByRole('link', { name: 'Export / import' }).click();
    await expect(page.getByRole('button', { name: 'Export all sessions' })).toBeInViewport();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export all sessions' }).click();
    expect((await download).suggestedFilename()).toContain('rehearse');
  });
}
