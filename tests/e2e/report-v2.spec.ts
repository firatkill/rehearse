import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { reportSession } from './report-helpers';
for (const theme of ['light', 'dark'] as const) {
  test(`TC-150 V-23 report heat table and actions in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await reportSession(page, info);
    await page.clock.resume(); // axe requires browser timers after the deterministic interview flow.
    await expect(page.getByRole('heading', { name: 'Every answer at a glance' })).toBeVisible();
    const table = page.getByRole('table', { name: 'Scores by question and dimension' });
    await expect(table.getByRole('row')).toHaveCount(4);
    await expect(table.getByRole('columnheader')).toHaveText([
      'Question',
      'Structure',
      'Specificity',
      'Ownership',
      'Impact',
      'Relevance',
      'Clarity',
      'Tries',
    ]);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
    await table.getByRole('link').first().click();
    await expect(page.locator('#report-answer-0')).toHaveAttribute('open');
    await expect(page.getByRole('button', { name: 'Save as PDF' })).toBeVisible();
  });
}
