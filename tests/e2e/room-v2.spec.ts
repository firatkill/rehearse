import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scenarios } from './helpers';
import { prepareVoice, startAnswer } from './voice-helpers';
for (const theme of ['light', 'dark'] as const) {
  test(`TC-141 V-15 room stays dark at 390px with ${theme} page preference`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareVoice(page, info, scenarios.happy, true);
    await expect(
      page.getByRole('button', { name: 'I’m ready to answer', exact: true }),
    ).toBeVisible();
    await startAnswer(page);
    await expect(page.locator('.room-shell')).toHaveCSS('background-color', 'rgb(13, 20, 18)');
    await expect(page.getByText('aim for 1:00–2:00')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Live transcript' })).toHaveAttribute(
      'aria-live',
      'off',
    );
    await expect(page.getByRole('button', { name: 'Stop and review' })).toBeFocused();
    const stop = await page.getByRole('button', { name: 'Stop and review' }).boundingBox();
    expect(stop?.height).toBeGreaterThanOrEqual(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.clock.resume(); // axe needs browser timers; recording limits remain unchanged.
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `.git/v15-${theme}-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `.git/v15-${theme}-1440.png`, fullPage: true });
    await page.getByRole('button', { name: 'Type instead' }).click();
    await expect(page.getByLabel('Your answer', { exact: true })).toBeFocused();
    await page
      .getByLabel('Your answer', { exact: true })
      .fill(
        'I traced the checkout failure to a token rename, rolled back the package and added a browser regression check.',
      );
    await page.getByRole('button', { name: 'Review answer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Get feedback', exact: true })).toBeVisible();
  });
}
