import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';

test('TC-140 V-14 one-click warm-up restores settings and starts three questions', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  await page.getByLabel('Backend', { exact: true }).check();
  await page.getByLabel('Senior', { exact: true }).check();
  await page.getByLabel('5 questions').check();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Quick warm-up' })).toContainText(
    'Backend · Senior · Typing',
  );
  const request = page.waitForRequest(
    (request) => request.url().endsWith('/api/sessions/start') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Start in one click' }).click();
  expect((await request).postDataJSON()).toMatchObject({
    role: 'backend',
    seniority: 'senior',
    length: 3,
    mode: 'text',
  });
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
});
for (const theme of ['light', 'dark'] as const) {
  test(`TC-140 V-14 setup paths and mobile accessibility in ${theme}`, async ({ page }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/setup#job-post');
    await expect(page.getByRole('heading', { name: 'Practise for a job post' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read the job post' })).toBeDisabled();
    await expect(page.getByText(/Coming next: three example posts/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Practise by role' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Language', exact: true })).toHaveCount(0);
    await page.getByLabel('Frontend', { exact: true }).check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `.git/v14-${theme}-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `.git/v14-${theme}-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
  });
}
