import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';

for (const theme of ['light', 'dark'] as const) {
  test(`TC-146 TC-148 retry preserves attempts and feedback hierarchy in ${theme} theme`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize(
      theme === 'dark' ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    let calls = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/feedback') && request.method() === 'POST') calls++;
    });
    await page.goto('/setup');
    await page.getByLabel('Read questions aloud').uncheck();
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await page.getByRole('button', { name: 'Start the interview' }).click();
    await page.getByRole('button', { name: 'Start now', exact: true }).click();
    for (let attempt = 1; attempt <= 2; attempt++) {
      await page
        .getByLabel('Your answer', { exact: true })
        .fill(
          `I led attempt ${attempt}: traced the regression, shipped a fix and cut failures by 30 percent.`,
        );
      await page.getByRole('button', { name: 'Review answer', exact: true }).click();
      await page.getByRole('button', { name: 'Get feedback', exact: true }).click();
      await expect(page.getByRole('tab', { name: `Attempt ${attempt}` })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(calls).toBe(attempt);
      if (theme === 'light') {
        await expect(page.locator('.room-column')).toHaveCSS('max-width', '1200px');
        const delivery = await page.locator('.feedback-delivery dd').first().boundingBox();
        expect(delivery?.width).toBeGreaterThan(180);
      }
      await expect(
        page.getByRole('region', { name: 'Change one thing', exact: true }),
      ).toBeVisible();
      await expect(page.locator('.feedback-details details[open]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      if (attempt === 1) {
        await page.getByRole('button', { name: 'Try again with this' }).click();
        await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('');
        expect(calls).toBe(1);
      }
    }
    await page.reload();
    await expect(page.getByRole('tab', { name: 'Attempt 2' })).toBeVisible();
    await page.getByRole('tab', { name: 'Attempt 1' }).click();
    await expect(
      page.getByRole('region', { name: 'Your answer, marked up', exact: true }),
    ).toContainText(
      'I led attempt 1: traced the regression, shipped a fix and cut failures by 30 percent.',
    );
    await page.getByRole('button', { name: 'Try again with this' }).click();
    await page.getByLabel('Your answer', { exact: true }).fill('Unfinished third draft');
    await page.getByRole('button', { name: 'End session', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'End session', exact: true })
      .click();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.getByText(/2 tries/)).toBeVisible();
    await page.getByText(/Question 1:.*2 tries/).click();
    await expect(
      page.getByRole('region', { name: 'Your answer, marked up', exact: true }),
    ).toContainText(
      'I led attempt 1: traced the regression, shipped a fix and cut failures by 30 percent.',
    );
    await expect(page.getByText('Unfinished third draft', { exact: true })).toHaveCount(0);
    expect(calls).toBe(2);
  });
}
