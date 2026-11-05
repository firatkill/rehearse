import { registerHistory } from './history.cases';
import { registerLocaleDates } from './locale-dates.cases';
import { registerExportImport } from './export-import.cases';
import { registerProgressV2 } from './progress-v2.cases';
import { registerA11Y } from './a11y.cases';
import { expect } from '@playwright/test';
import { test } from '../setup/cap-server';
import { HealthResponseSchema, StartResponseSchema, ErrorBodySchema } from '@/lib/api/contracts';
import { scenarios, uniqueIp, serverUrl } from './helpers';
import { installSpeechMock } from './speech-mock';
import { apiFeedback } from './api-helpers';

test.describe.configure({ mode: 'serial' });
test('TC-110 E2E-13 global cap and TC-010 fourth-server health @isolated', async ({
  page,
  capOrigin,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const health = await page.request.get(`${capOrigin}/api/health`, {
    headers: { 'x-real-ip': uniqueIp(info) },
  });
  expect(health.status()).toBe(200);
  expect(HealthResponseSchema.parse(await health.json())).toMatchObject({
    status: 'ok',
    demoMode: 'on',
    llmMode: 'mock',
    rateLimitBackend: 'memory',
  });
  await page.goto(`${capOrigin}/setup`);
  await page.getByLabel('Text: type your answers').check();
  const started = page.waitForResponse('**/api/sessions/start');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const session = StartResponseSchema.parse(await (await started).json());
  for (let call = 0; call < 2; call++)
    expect((await apiFeedback(page, info, session, 3)).status()).toBe(200);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
  await page.getByLabel('Your answer').fill('I led the delivery and checked the result.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  const rejected = page.waitForResponse('**/api/feedback');
  await page.getByRole('button', { name: 'Get feedback' }).click();
  const response = await rejected;
  expect(response.status()).toBe(429);
  expect(ErrorBodySchema.parse(await response.json()).error.code).toBe('GLOBAL_CAP_REACHED');
  await expect(
    page.getByRole('heading', { name: 'The demo has reached its daily limit' }),
  ).toBeFocused();
  await expect(
    page.getByText('Rehearse scores up to 2 answers a day across all visitors so it stays free.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Your answer is saved, and you can run Rehearse yourself from the GitHub repository.',
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save without feedback' }).click();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
});

test.describe('Full shared storage @isolated', () => {
  test.beforeEach(async ({ request }, info) => {
    for (const offset of [0, 1]) {
      const origin = serverUrl(info, offset);
      expect(
        (
          await request.post(`${origin}/api/data`, {
            headers: { origin, 'x-real-ip': uniqueIp(info) },
            data: { operation: 'deleteAll' },
          })
        ).ok(),
      ).toBe(true);
    }
  });
  test.afterEach(async ({ request }, info) => {
    for (const offset of [0, 1]) {
      const origin = serverUrl(info, offset);
      expect(
        (
          await request.post(`${origin}/api/data`, {
            headers: { origin, 'x-real-ip': uniqueIp(info) },
            data: { operation: 'deleteAll' },
          })
        ).ok(),
      ).toBe(true);
    }
  });
  test.describe('history @isolated', () => {
    registerHistory();
  });
  test.describe('locale-dates @isolated', () => {
    registerLocaleDates();
  });
  test.describe('export-import @isolated', () => {
    registerExportImport();
  });
  test.describe('progress-v2 @isolated', () => {
    registerProgressV2();
  });
  test.describe('a11y @isolated', () => {
    registerA11Y();
  });
});
