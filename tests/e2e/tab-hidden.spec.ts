import { expect, test } from '@playwright/test';
import { prepareVoice, startAnswer } from './voice-helpers';
import { scenarios, setHidden, speech } from './helpers';
test('TC-059 E2E-09 hidden asking offers replay; thinking pauses; hidden recording retains words', async ({
  page,
}, info) => {
  await prepareVoice(page, info, { ...scenarios.happy, ttsMsPerChar: 20 });
  await page.clock.runFor(100);
  await setHidden(page, true);
  await page.clock.runFor(5000);
  await setHidden(page, false);
  await expect(page.getByRole('button', { name: 'Replay question' })).toBeVisible();
  await page.getByRole('button', { name: 'Replay question' }).click();
  await page.clock.runFor(100);
  await expect(page.locator('h1 .underline')).toBeVisible();
  await page.getByRole('button', { name: 'Stop reading' }).click();
  await expect(page.getByText('Recording starts when the timer ends.')).toBeVisible();
  await setHidden(page, true);
  await page.clock.runFor(20000);
  expect(await speech(page).runs()).toBe(0);
  await setHidden(page, false);
  await expect(page.getByText('Timer paused while you were away.')).toBeVisible();
  await startAnswer(page);
  await page.clock.runFor(650);
  await setHidden(page, true);
  await page.clock.runFor(30);
  await setHidden(page, false);
  await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
  await page.clock.runFor(1); // Publish the review live-region notice after mount.
  await expect(page.getByText('Recording stopped because you left the tab.')).toBeVisible();
  await expect(page.getByLabel('Your answer')).toHaveValue(
    'I led the project and improved delivery.',
  );
});
test('TC-059 FR-55 offline stops voice; reconnect does not restart it', async ({ page }, info) => {
  await prepareVoice(page, info);
  await startAnswer(page);
  await page.clock.runFor(650);
  await page.context().setOffline(true);
  await page.clock.runFor(30);
  await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
  await page.clock.runFor(1); // Publish the review live-region notice after mount.
  await expect(
    page.getByText('Speech recognition lost its connection. Your words so far are below.'),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page.clock.runFor(2000);
  expect(await speech(page).runs()).toBe(1);
});

test('TC-059 FR-55 starting offline uses text for one answer without changing the session mode', async ({
  page,
}, info) => {
  await prepareVoice(page, info);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await expect(page.getByLabel('Your answer')).toBeFocused();
  expect(await speech(page).runs()).toBe(0);
  await page.getByLabel('Your answer').fill('I typed this answer offline.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.context().setOffline(false);
  await page.getByRole('button', { name: 'Next question' }).click();
  await startAnswer(page);
  await page.clock.runFor(650);
  expect(await speech(page).runs()).toBe(1);
});
