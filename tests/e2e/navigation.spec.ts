import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-137 V-11 history redirects and shared nav reaches practice/progress/sample', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/history');
  await expect(page).toHaveURL(/\/progress$/);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Job post' })).toHaveAttribute(
    'href',
    '/setup#job-post',
  );
  await nav.getByRole('link', { name: 'Practise', exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByRole('link', { name: 'Sample report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await nav.getByRole('link', { name: 'Progress', exact: true }).click();
  await expect(page).toHaveURL(/\/progress$/);
});
