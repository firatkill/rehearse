import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { QUESTION_TYPE_LABELS } from '@/lib/labels';
import { uniqueIp } from './helpers';
for (const theme of ['light', 'dark'] as const) {
  test(`TC-139 V-13 public pages work without JavaScript in ${theme}`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme: theme,
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: { 'x-real-ip': uniqueIp(info) },
    });
    const page = await context.newPage();
    try {
      const origin = info.project.use.baseURL;
      for (const [route, title] of [
        ['/how-it-works', 'How it works'],
        ['/privacy', 'Privacy'],
        ['/sample', 'Session report'],
      ] as const) {
        const response = await page.goto(`${origin}${route}`);
        expect(response?.status()).toBe(200);
        await expect(
          page.getByRole('heading', { name: title, exact: true, level: 1 }),
        ).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (route === '/how-it-works') {
          await page
            .locator('summary')
            .filter({ hasText: QUESTION_TYPE_LABELS.behavioral })
            .click();
          await expect(
            page
              .locator('details[open]')
              .getByText('Is the answer organised so a listener can follow it?'),
          ).toBeVisible();
          await expect(page.getByText(/All gates passed/)).toBeVisible();
        }
        if (route === '/privacy')
          await expect(
            page.getByText(/recognition sends your audio to Google’s servers/),
          ).toBeVisible();
      }
      const links = await page
        .locator('header a[href^="/"], footer a[href^="/"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      for (const href of links)
        if (href) expect((await page.request.get(`${origin}${href}`)).status()).toBe(200);
    } finally {
      await context.close();
    }
  });
  test(`TC-139 E2E-30 public page accessibility in ${theme}`, async ({ page }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.emulateMedia({ colorScheme: theme });
    for (const route of ['/how-it-works', '/privacy', '/sample']) {
      await page.goto(route);
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
  });
}
