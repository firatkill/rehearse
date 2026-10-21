import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp, serverUrl, setHidden, speech } from './helpers';
import { installSpeechMock } from './speech-mock';
test.beforeEach(async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto(`${serverUrl(testInfo, 0)}/setup`);
  await page.getByLabel('Text: type your answers').check();
  await page.getByLabel('3 questions').check();
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeFocused();
  await expect(page).toHaveTitle('Interview · Rehearse');
});
test('TC-079 E2E-05 scored text session retains all three edited answers', async ({ page }) => {
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await expect(page.getByRole('button', { name: 'Start answering now' })).toBeFocused();
  await page.clock.runFor(2000);
  expect((await speech(page).spoken()).some((text) => text.trim().length > 0)).toBe(true);
  await expect(page.getByText('The answer box opens when the timer ends.')).toBeVisible();
  await setHidden(page, true);
  await page.clock.runFor(16000);
  await expect(page.getByRole('button', { name: 'Start answering now' })).toBeVisible();
  await setHidden(page, false);
  await expect(page.getByText('Timer paused while you were away.')).toBeVisible();
  await page.clock.runFor(15000);
  for (let index = 0; index < 3; index++) {
    if (index > 0) await page.getByRole('button', { name: 'Start answering now' }).click();
    const input = page.getByLabel('Your answer');
    await expect(input).toBeFocused();
    await input.fill(`I improved delivery for project ${index + 1}.`);
    await page.clock.runFor(250000);
    await expect(page.getByRole('button', { name: 'Review answer' })).toBeVisible();
    await page.getByRole('button', { name: 'Review answer' }).click();
    await expect(input).toBeFocused();
    await input.fill(`I improved delivery for project ${index + 1} with measurable results.`);
    await page.getByRole('button', { name: 'Get feedback' }).click();
    await expect(
      page.getByRole('heading', { name: `Feedback on question ${index + 1}` }),
    ).toBeFocused();
    await expect(page.getByRole('heading', { name: 'What interviewers listen for' })).toBeVisible();
    await page
      .getByRole('button', { name: index === 2 ? 'Finish and see report' : 'Next question' })
      .click();
  }
  await expect(page).toHaveURL(/\/report$/);
  await expect(page).toHaveTitle('Session report · Rehearse');
  for (let index = 0; index < 3; index++)
    await expect(
      page.getByText(`I improved delivery for project ${index + 1} with measurable results.`),
    ).toBeVisible();
});
test('TC-041 E2E-05 skip cancellation preserves text; end after an answer retains report', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('My draft remains here.');
  await page.getByRole('button', { name: 'Skip question', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep answering' })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.clock.runFor(1); // Dialog focus restoration runs after unmount.
  await expect(page.getByRole('button', { name: 'Skip question', exact: true })).toBeFocused();
  await expect(page.getByLabel('Your answer')).toHaveValue('My draft remains here.');
  await page.getByRole('button', { name: 'Skip question', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Skip question', exact: true })
    .click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('I delivered a measurable result.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Save without feedback' }).click();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep going' })).toBeFocused();
  await expect(
    page.getByText('Your report will include the 1 questions you’ve answered.'),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByText('Skipped', { exact: true })).toBeVisible();
  await expect(page.getByText('I delivered a measurable result.')).toBeVisible();
});
test('TC-041 E2E-05 ending before any answers deletes the session', async ({ page }) => {
  const url = page.url();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(
    page.getByText('You haven’t answered any questions yet, so there will be no report.'),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Session not found' })).toBeVisible();
});
