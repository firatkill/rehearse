import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from '../e2e/helpers';
import { installSpeechMock } from '../e2e/speech-mock';

test.use({ locale: 'tr-TR' });
test('TC-206 demo stays English with a disabled full-version Turkish option', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup?language=tr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('radio', { name: 'Türkçe · Full version' })).toBeDisabled();
  await expect(
    page.getByText('Available in the self-hosted version.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('radio', { name: 'English', exact: true })).toBeChecked();
  const response = await page.request.post('/api/sessions/start', {
    headers: { origin: new URL(page.url()).origin },
    data: {
      role: 'full-stack',
      seniority: 'mid',
      types: ['behavioral'],
      length: 3,
      mode: 'text',
      feedback: true,
      language: 'tr',
    },
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ error: { code: 'DEMO_ONLY' } });
});
