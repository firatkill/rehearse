import { expect, test } from '@playwright/test';
import { installSpeechMock } from '../e2e/speech-mock';
import { scenarios, uniqueIp } from '../e2e/helpers';
test('TC-162 whole demo flow uses only app requests and always labels sample feedback', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const external: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
      external.push(url.origin);
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/setup');
  await page.getByLabel('Job post link or text').fill('https://example.com/private-job');
  await page.getByRole('button', { name: 'Read the job post' }).click();
  await expect(
    page.getByText(
      'Job-post interviews run in the self-hosted version. Try one of these example posts:',
    ),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Northwind Pay', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What we read' })).toBeVisible();
  await page.getByRole('link', { name: 'Practise with these example questions' }).click();
  await page.getByLabel('Text: type your answers').check();
  await page.getByLabel('3 questions').check();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
    await page
      .getByLabel('Your answer')
      .fill(
        'I compared two options and improved delivery by 25 percent. I tested the result with my team.',
      );
    await page.getByRole('button', { name: 'Review answer' }).click();
    await page.getByRole('button', { name: 'Get feedback' }).click();
    await expect(page.getByText('Sample feedback', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: index === 2 ? 'Finish and see report' : 'Next question' })
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'You’re trying the demo. Feedback here is pre-written sample data and no AI is called.',
    ),
  ).toBeVisible();
  expect(external).toEqual([]);
});
