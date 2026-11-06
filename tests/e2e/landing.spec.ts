import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { uniqueIp } from './helpers';
for (const theme of ['light', 'dark'] as const)
  for (const width of [1440, 390]) {
    test(`TC-138 V-12 landing ${theme} ${width}`, async ({ page }, info) => {
      await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Rehearse the interview before you have it.',
      );
      await expect(
        page.getByRole('figure', { name: 'Example of feedback on an answer' }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({ path: info.outputPath(`v12-${theme}-${width}.png`), fullPage: true });
      await page.getByRole('link', { name: 'See a sample report', exact: true }).click();
      await expect(page).toHaveURL(/\/sample$/);
    });
  }
