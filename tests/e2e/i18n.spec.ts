import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';

test.use({ locale: 'tr-TR' });
test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
});
test('TC-204 V-60 browser locale does not choose interview language; explicit full UI choice renders Turkish', async ({
  page,
}) => {
  await page.goto('/setup');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What are you preparing for?');
  await page.goto('/setup?language=tr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neye hazırlanıyorsun?');
  await expect(page.getByLabel('3 soru (yaklaşık 10 dakika)')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gelişim', exact: true })).toHaveAttribute(
    'href',
    '/progress?language=tr',
  );
  await page.getByRole('link', { name: 'Gelişim', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gelişim');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('TC-204 V-60 internal language headers cannot override the explicit URL', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({
    'x-real-ip': uniqueIp(info),
    'x-rehearse-language': 'tr',
    'x-rehearse-path': '/setup?language=tr',
  });
  await page.goto('/setup');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
});
