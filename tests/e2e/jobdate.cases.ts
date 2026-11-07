import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';
import { jobText } from '../fixtures/jobpost';
export function registerJobDate() {
  test('TC-182 date persists, Progress shows days and unanswered questions, clearing removes card @isolated', async ({
    page,
  }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    await page.clock.setFixedTime(new Date('2026-11-05T12:00:00Z'));
    await page.goto('/setup');
    await page.getByLabel('Job post link or text').fill(jobText);
    await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
    await page.getByLabel('Interview date', { exact: true }).fill('2026-11-11');
    await page.getByRole('button', { name: 'Save date', exact: true }).click();
    await expect(page.getByText('Interview date saved.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Interview date', { exact: true })).toHaveValue('2026-11-11');
    await page.getByRole('button', { name: 'Analyse the job post', exact: true }).click();
    await page.getByRole('button', { name: 'Generate questions', exact: true }).click();
    await expect(page.getByRole('checkbox')).toHaveCount(8);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto('/progress');
    await expect(page.getByText('Coming up · in 6 days', { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        'You’ve practised 0 of 8 questions from this post. 8 have never been answered.',
        { exact: true },
      ),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('link', { name: 'Open questions', exact: true }).click();
    await page.getByRole('button', { name: 'Clear date', exact: true }).click();
    await expect(page.getByText('Interview date cleared.', { exact: true })).toBeVisible();
    await page.goto('/progress');
    await expect(page.getByRole('heading', { name: 'No sessions yet', exact: true })).toBeVisible();
    await expect(page.getByText(/Coming up/)).toHaveCount(0);
  });
}
