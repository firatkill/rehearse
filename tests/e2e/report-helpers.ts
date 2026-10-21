import { expect, type Page, type TestInfo } from '@playwright/test';
import { scenarios, serverUrl, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
export async function reportSession(page: Page, info: TestInfo, scored = true, readonly = false) {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto(`${serverUrl(info, readonly ? 1 : 0)}/setup`);
  await page.getByLabel('Text: type your answers').check();
  await page.getByLabel('3 questions').check();
  await page
    .getByRole('button', {
      name: readonly ? 'Start session without feedback' : 'Start session',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: 'Start answering now' }).click();
    await page
      .getByLabel('Your answer')
      .fill(
        `I delivered project ${index + 1}. I reduced retries from 10 to 2 and explained the result.`,
      );
    await page.getByRole('button', { name: 'Review answer' }).click();
    await page
      .getByRole('button', {
        name: scored ? 'Get feedback' : readonly ? 'Save and continue' : 'Save without feedback',
        exact: true,
      })
      .click();
    if (scored)
      await expect(
        page.getByRole('heading', { name: `Feedback on question ${index + 1}` }),
      ).toBeFocused();
    await page
      .getByRole('button', { name: index === 2 ? 'Finish and see report' : 'Next question' })
      .click();
  }
  await expect(page).toHaveURL(/\/report$/);
}
