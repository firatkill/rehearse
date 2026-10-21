import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.happy);
});

test('TC-013 FR-53 E2E-26 system theme and stored toggle survive reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('TC-014 NFR-08 NFR-09 shell keyboard and narrow layout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  for (const name of ['Practise', 'Sample report', 'History', 'How it works', 'GitHub']) {
    await expect(
      page.getByRole('navigation').getByRole('link', { name, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText('Built by Fırat Kıl', { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('TC-015 PRD 9.13 unknown page and demo banners', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByText('There’s nothing at this address.')).toBeVisible();
  await page.goto('http://localhost:3201');
  await expect(
    page.getByRole('status').filter({ hasText: 'Feedback is paused on the live demo.' }),
  ).toBeVisible();
  await page.goto('http://localhost:3202');
  await expect(
    page.getByRole('status').filter({ hasText: 'The practice room is offline for maintenance.' }),
  ).toBeVisible();
});

test('TC-009 TC-014 NFR-08 NFR-13 shell CSP and accessibility', async ({ page }) => {
  const response = await page.goto('/');
  const policy = response?.headers()['content-security-policy'] ?? '';
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  const nonces = await page
    .locator('script')
    .evaluateAll((scripts) => scripts.map((script) => script.nonce));
  expect(nonces.length).toBeGreaterThan(0);
  expect(nonces.every((value) => value === nonce)).toBe(true);
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([]);
  }
});
