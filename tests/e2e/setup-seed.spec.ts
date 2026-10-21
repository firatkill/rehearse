import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp, serverUrl } from './helpers';
import { installSpeechMock } from './speech-mock';
import { StartResponseSchema, type StartResponse } from '../../lib/api/contracts';

test('TC-033 E2E-04 seeded starts return identical questions and invalid seeds are dropped', async ({
  page,
}, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.happy);
  const prompts: string[][] = [];
  const responses: StartResponse[] = [];
  await page.route('**/api/sessions/start', async (route) => {
    const response = await route.fetch();
    responses.push(StartResponseSchema.parse(await response.json()));
    await route.fulfill({ response });
  });
  for (let i = 0; i < 2; i++) {
    await page.goto(`${serverUrl(testInfo, 1)}/setup?seed=0000abcd`);
    await expect(
      page.getByText(
        'Using seed 0000abcd. You’ll get the same questions as the session that used it.',
      ),
    ).toBeVisible();
    await page.getByLabel('Text: type your answers').check();
    await page.getByRole('button', { name: 'Start session without feedback' }).click();
    await expect.poll(() => responses.length).toBe(i + 1);
    const data = responses[i];
    if (!data) throw new Error('Missing captured start response');
    prompts.push(data.questions.map((q) => q.prompt));
    await expect(page).toHaveURL(new RegExp(`/session/${data.sessionId}$`));
  }
  expect(prompts[0]).toEqual(prompts[1]);
  await page.goto(`${serverUrl(testInfo, 1)}/setup?seed=xyz`);
  await expect(page.getByText('That seed isn’t valid, so a new one will be used.')).toBeVisible();
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/sessions/start') && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Start session without feedback' }).click();
  const body: unknown = (await request).postDataJSON();
  expect(body).not.toHaveProperty('seed');
  // Let the intercepted real request and navigation finish before closing the page.
  await expect.poll(() => responses.length).toBe(3);
  const finalSession = responses[2];
  if (!finalSession) throw new Error('Missing unseeded response');
  await expect(page).toHaveURL(new RegExp(`/session/${finalSession.sessionId}$`));
});
