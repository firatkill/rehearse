import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';
import { jobText } from '../fixtures/jobpost';
test('TC-176 pasted post is reviewed, generated and practised with server-owned questions', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  await page.getByLabel('Job post link or text').fill(jobText);
  await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review the job post', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Something wrong? Edit what we read' }).click();
  await page
    .getByLabel('Edit what we read', { exact: true })
    .fill(jobText + '\nMentor colleagues through constructive code reviews.');
  await page.getByRole('button', { name: 'Save text', exact: true }).click();
  await page.getByRole('button', { name: 'Generate questions', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(8);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page.getByText('5 of 8 selected', { exact: true })).toBeVisible();
  await page.getByRole('checkbox').nth(3).uncheck();
  await page.getByRole('checkbox').nth(4).uncheck();
  const feedbackResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/feedback'),
  );
  await page.getByRole('button', { name: 'Start with 3 questions' }).click();
  await expect(page.locator('.room-context')).toHaveText('Example employer · Software engineer');
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
  await page
    .getByLabel('Your answer')
    .fill(
      'I built an accessible operator dashboard and reduced investigation time by 25 percent. I measured the change with operations staff.',
    );
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Get feedback' }).click();
  expect((await feedbackResponse).status()).toBe(200);
});

test('TC-179 five more questions preserve existing ids and the current selection', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  await page.getByLabel('Job post link or text').fill(jobText);
  await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
  await page.getByRole('button', { name: 'Generate questions', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(8);
  await page.getByRole('checkbox').nth(3).uncheck();
  await page.getByRole('checkbox').nth(4).uncheck();
  const before = await page
    .getByRole('checkbox')
    .evaluateAll((inputs) =>
      inputs.map((input) => ({ id: input.id, selected: (input as HTMLInputElement).checked })),
    );
  await page.getByRole('button', { name: 'Generate 5 more', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(13);
  const after = await page
    .getByRole('checkbox')
    .evaluateAll((inputs) =>
      inputs.map((input) => ({ id: input.id, selected: (input as HTMLInputElement).checked })),
    );
  expect(after.slice(0, 8)).toEqual(before);
  expect(after.slice(8).every((item) => !item.selected)).toBe(true);
  await expect(page.getByText('3 of 13 selected', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start with 3 questions', exact: true }),
  ).toBeEnabled();
});

test('TC-181 an unsafe link falls back to focused paste input and review before generation', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  await page.getByLabel('Job post link or text').fill('http://127.0.0.1/private');
  await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveText(
    'We couldn’t read that link. Paste the job post text below.',
  );
  await expect(page.getByLabel('Paste the job post text', { exact: true })).toBeFocused();
  await page.getByLabel('Paste the job post text', { exact: true }).fill(jobText);
  await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review the job post', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Generate questions', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(8);
});
