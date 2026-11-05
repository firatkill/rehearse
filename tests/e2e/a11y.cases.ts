import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
import { startTextSession } from './storage-helpers';
import { prepareVoice, startAnswer } from './voice-helpers';
import { seedLocalSession } from './local-session-helpers';

export function registerA11Y() {
  async function audit(page: Page, frozen = false) {
    const analysis = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    if (frozen) {
      // Axe schedules browser work; drive the mocked clock rather than sleeping or raising timeouts.
      const state = { complete: false };
      const settled = analysis.then(
        () => {
          state.complete = true;
        },
        () => {
          state.complete = true;
        },
      );
      while (!state.complete) {
        try {
          await page.clock.runFor(1);
        } catch (error) {
          // Axe finishRun closes its auxiliary page; the context-wide clock can race that cleanup.
          // The tested page must remain open and the complete axe result must still succeed.
          if (
            page.isClosed() ||
            !(error instanceof Error) ||
            !error.message.includes('Target page, context or browser has been closed')
          )
            throw error;
          await settled;
        }
      }
      await settled;
    }
    const results = await analysis;
    expect(
      results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([]);
  }
  for (const theme of ['light', 'dark'] as const) {
    for (const path of ['/setup', '/sample', '/history']) {
      test(`TC-118 E2E-30 ${path} ${theme}`, async ({ page }, info) => {
        await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
        await page.addInitScript(installSpeechMock, scenarios.noRecognition);
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        if (path === '/history')
          await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
        await audit(page);
      });
    }
    test(`TC-118 E2E-30 filled history and report ${theme}`, async ({ page }, info) => {
      await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
      await page.addInitScript(installSpeechMock, scenarios.noRecognition);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/history');
      await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
      const id = await seedLocalSession(page);
      await page.reload();
      await expect(page.getByRole('link', { name: 'Open report', exact: true })).toBeVisible();
      await audit(page);
      await page.goto(`/session/${id}/report`);
      await expect(
        page.getByRole('heading', { name: 'Session report', exact: true }),
      ).toBeVisible();
      await audit(page);
    });
    test(`TC-118 E2E-30 text room phases ${theme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: theme });
      await startTextSession(page, info);
      await audit(page, true);
      await page.getByRole('button', { name: 'Start the interview' }).click();
      await expect(
        page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }),
      ).toBeFocused();
      await audit(page, true);
      await page.clock.runFor(10000);
      await expect(page.getByText('The answer box opens when the timer ends.')).toBeVisible();
      await audit(page, true);
      await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
      await expect(page.getByLabel('Your answer')).toBeFocused();
      await audit(page, true);
      await page
        .getByLabel('Your answer')
        .fill('I delivered a project and reduced errors from ten to two.');
      await page.getByRole('button', { name: 'Review answer' }).click();
      await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
      await audit(page, true);
      await page.getByRole('button', { name: 'Get feedback' }).click();
      await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeFocused();
      await audit(page, true);
    });
    test(`TC-118 E2E-30 recording ${theme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: theme });
      await prepareVoice(page, info);
      await startAnswer(page);
      await page.clock.runFor(200);
      await audit(page, true);
    });
    test(`TC-118 E2E-30 speech error ${theme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: theme });
      await prepareVoice(page, info, scenarios.micDenied);
      await expect(
        page.getByRole('heading', { name: 'Microphone access is blocked' }),
      ).toBeVisible();
      await audit(page, true);
    });
  }
}
