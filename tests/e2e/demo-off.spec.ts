import { expect, test } from '@playwright/test';
import { scenarios, serverUrl, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
import { seedLocalSession } from './local-session-helpers';
import { expectError, startBody } from './api-helpers';
test('TC-111 E2E-15 disabled demo keeps existing reports and history available', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const origin = serverUrl(info, 2);
  await page.goto(`${origin}/setup`);
  await expect(
    page.getByRole('heading', { name: 'The practice room is offline for maintenance' }),
  ).toBeVisible();
  await expect(
    page.getByText('You can still read the sample report and your saved sessions.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toHaveCount(0);
  await expectError(
    await page.request.post(`${origin}/api/sessions/start`, {
      headers: { Origin: origin, 'x-real-ip': uniqueIp(info) },
      data: startBody,
    }),
    503,
    'DEMO_OFF',
  );
  await page.goto(`${origin}/sample`);
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await page.goto(`${origin}/history`);
  await expect(
    page.getByRole('heading', { name: 'Your practice history', exact: true }),
  ).toBeVisible();
  const id = await seedLocalSession(page, true);
  await page.goto(`${origin}/session/${id}`);
  await expect(
    page.getByText(
      'The practice room is offline, so this session can’t continue right now. You can open what you’ve answered so far.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the interview' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Open report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
});
