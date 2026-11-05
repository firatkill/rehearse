import { expect, test, type Page } from '@playwright/test';
import { scenarios, uniqueIp, speech } from './helpers';
import { installSpeechMock } from './speech-mock';
import { startTextSession, storedRoom } from './storage-helpers';
import { prepareVoice, startAnswer } from './voice-helpers';
import { seedLocalSession } from './local-session-helpers';
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
for (const viewport of [
  { width: 360, height: 740 },
  { width: 1024, height: 768 },
]) {
  test(`TC-114 E2E-25 pages and text phases at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    for (const path of ['/', '/setup', '/sample', '/history']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await fits(page);
    }
    const id = await seedLocalSession(page);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Open report', exact: true })).toBeVisible();
    await fits(page);
    await page.goto(`/session/${id}/report`);
    await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
    await fits(page);
    await startTextSession(page, info);
    await fits(page);
    await page.getByRole('button', { name: 'Start the interview' }).click();
    await expect(
      page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }),
    ).toBeFocused();
    await fits(page);
    await page.clock.runFor(10000);
    await expect(page.getByText('The answer box opens when the timer ends.')).toBeVisible();
    await fits(page);
    await expect
      .poll(async () => (await storedRoom(page)).session.checkpoint.phase)
      .toBe('thinking');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
    await fits(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
    await expect(page.getByLabel('Your answer')).toBeFocused();
    await fits(page);
    await page
      .getByLabel('Your answer')
      .fill('I delivered a project and reduced errors from ten to two.');
    await page.getByRole('button', { name: 'Review answer' }).click();
    await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
    await fits(page);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    await page.route('**/api/feedback', async (route) => {
      await gate;
      if (++requests === 1)
        await route.fulfill({
          status: 502,
          json: {
            error: {
              code: 'PROVIDER_ERROR',
              message: 'PROVIDER_ERROR',
              requestId: 'responsive-test',
              sessionCallsRemaining: 4,
            },
          },
        });
      else await route.continue();
    });
    try {
      await page.getByRole('button', { name: 'Get feedback' }).click();
      await expect(page.getByText('Reading your answer…', { exact: true }).last()).toBeVisible();
      await fits(page);
    } finally {
      release();
    }
    await expect(page.getByRole('heading', { name: 'Feedback didn’t arrive' })).toBeVisible();
    await fits(page);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeFocused();
    await fits(page);
    await page.unroute('**/api/feedback');
    await page.getByRole('button', { name: 'Next question' }).click();
    await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
    await page.getByLabel('Your answer').fill('I saved this practice answer without feedback.');
    await page.getByRole('button', { name: 'Review answer' }).click();
    await page.getByRole('button', { name: 'Save without feedback' }).click();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
    await fits(page);
    await page.getByRole('button', { name: 'Next question' }).click();
    await page.getByRole('button', { name: 'Skip question', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Skip this question?' });
    await expect(dialog).toBeVisible();
    await fits(page);
    await dialog.getByRole('button', { name: 'Skip question', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
    await fits(page);
  });
  test(`TC-114 E2E-25 voice and error phases at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await prepareVoice(page, info);
    await fits(page);
    await startAnswer(page);
    await fits(page);
    await speech(page).fail('network');
    await expect(
      page.getByRole('heading', { name: 'Speech recognition isn’t available right now' }),
    ).toBeVisible();
    await fits(page);
    await page.getByRole('button', { name: 'Type instead' }).click();
    await expect(page.getByLabel('Your answer')).toBeFocused();
    await fits(page);
    await page.getByLabel('Your answer').fill('I can continue with a typed answer.');
    await page.getByRole('button', { name: 'Review answer' }).click();
    await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
    await fits(page);
  });
}
