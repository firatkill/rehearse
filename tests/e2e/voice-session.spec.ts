import { expect, test } from '@playwright/test';
import { prepareVoice, startAnswer } from './voice-helpers';
import { speech } from './helpers';
test('TC-056 E2E-06 three voice answers retain edited transcripts through practice-only report', async ({
  page,
}, info) => {
  await prepareVoice(page, info);
  await expect(page.getByRole('button', { name: 'Stop reading' })).toBeVisible();
  await page.clock.runFor(100);
  await expect(page.locator('h1 .underline')).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByText('Recording starts when the timer ends.')).toBeVisible();
  for (let index = 0; index < 3; index++) {
    await startAnswer(page);
    await page.clock.runFor(150);
    await expect(
      page.locator('#live-transcript').locator('..').getByText('I led', { exact: true }),
    ).toBeVisible();
    await page.clock.runFor(500);
    await expect(
      page.getByText('I led the project and improved delivery.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Stop and review' }).click();
    await page.clock.runFor(25);
    await expect(page.getByLabel('Your answer')).toBeFocused();
    await expect(page.getByLabel('Your answer')).toHaveValue(
      'I led the project and improved delivery.',
    );
    await expect(page.getByText('Not enough speech to measure')).toBeVisible();
    await page.getByLabel('Your answer').fill(`I led project ${index + 1} and improved delivery.`);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page
      .getByRole('button', { name: index === 2 ? 'Finish and see report' : 'Next question' })
      .click();
  }
  await expect(page).toHaveURL(/\/report$/);
  for (let i = 1; i <= 3; i++)
    await expect(page.getByText(`I led project ${i} and improved delivery.`)).toBeVisible();
  expect(await speech(page).runs()).toBe(3);
  expect((await speech(page).spoken()).filter((text) => text.trim())).not.toHaveLength(0);
});
