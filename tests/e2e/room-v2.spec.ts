import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scenarios } from './helpers';
import { prepareVoice, startAnswer } from './voice-helpers';
async function primary(page: Page, name: string) {
  const action = page.locator(
    '.room-stage .ui-button:is([data-variant="on-dark"], [data-variant="default"], [data-variant="primary"])',
  );
  await expect(action).toHaveCount(1);
  await expect(action).toHaveAccessibleName(name);
  await expect(action).toHaveCSS('min-height', '60px');
  await expect(action).toHaveCSS('font-size', '18px');
  await expect(action).toHaveCSS('font-weight', '600');
}
for (const theme of ['light', 'dark'] as const) {
  test(`TC-141 TC-143 V-15 room stays dark at 390px with ${theme} page preference`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareVoice(page, info, scenarios.happy, true);
    await expect(
      page.getByRole('button', { name: 'I’m ready to answer', exact: true }),
    ).toBeVisible();
    await primary(page, 'I’m ready to answer');
    await expect(page.getByRole('button', { name: 'Stop reading', exact: true })).toHaveAttribute(
      'data-variant',
      'text',
    );
    await page.getByRole('button', { name: 'Stop reading', exact: true }).click();
    await primary(page, 'Start now');
    await startAnswer(page);
    await primary(page, 'Stop and review');
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
    await expect(page.locator('.room-question')).toHaveCSS('font-size', '40px');
    await expect(page.locator('.room-question')).toHaveCSS('line-height', '47.2px');
    await page.screenshot({ path: `.git/v15-${theme}-1440.png`, fullPage: true });
    await page.getByRole('button', { name: 'Type instead' }).click();
    await expect(page.getByLabel('Your answer', { exact: true })).toBeFocused();
    await primary(page, 'Review answer');
    await page
      .getByLabel('Your answer', { exact: true })
      .fill(
        'I traced the checkout failure to a token rename, rolled back the package and added a browser regression check.',
      );
    await page.getByRole('button', { name: 'Review answer', exact: true }).click();
    await primary(page, 'Get feedback');
  });
}

test('TC-145 room shows captions and announces a stuck speech engine once', async ({
  page,
}, info) => {
  await prepareVoice(page, info, { ...scenarios.happy, ttsNeverStarts: true });
  const question = await page.locator('.room-question').innerText();
  await page.clock.runFor(2500);
  await expect(page.getByRole('button', { name: 'Start now', exact: true })).toBeVisible();
  await expect(page.locator('.room-question')).toHaveText(question);
  await page.clock.runFor(100); // Flush the announcer's deferred live-region update after React enters thinking.
  const status = page.locator('.room-stage > [role="status"]');
  await expect(status).toContainText('Read-aloud didn’t work, so the question is shown as text.');
  const announcement = await status.innerText();
  await page.clock.runFor(1000);
  await expect(status).toHaveText(announcement);
  await expect(page.locator('.room-question span').first()).toBeVisible();
});
