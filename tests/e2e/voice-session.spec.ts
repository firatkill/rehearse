import { expect, test } from '@playwright/test';
import { prepareVoice, startAnswer } from './voice-helpers';
import { speech, scenarios } from './helpers';
test('TC-079 E2E-06 three voice answers retain edits and scores through report', async ({
  page,
}, info) => {
  await prepareVoice(page, info, scenarios.happy, true);
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
    await page.getByRole('button', { name: 'Get feedback' }).click();
    await expect(
      page.getByRole('heading', { name: `Feedback on question ${index + 1}` }),
    ).toBeFocused();
    await page
      .getByRole('button', { name: index === 2 ? 'Finish and see report' : 'Next question' })
      .click();
  }
  await expect(page).toHaveURL(/\/report$/);
  // T-30 report disclosures are collapsed by default (PRD §9.8).
  for (const detail of await page.locator('details').all()) {
    await detail.locator(':scope > summary').click();
  }
  for (let i = 1; i <= 3; i++)
    await expect(
      page.locator('details > p').filter({ hasText: `I led project ${i} and improved delivery.` }),
    ).toBeVisible();
  expect(await speech(page).runs()).toBe(3);
  expect(await speech(page).overlaps()).toBe(0);
  expect(await speech(page).active()).toBe(false);
  expect((await speech(page).spoken()).filter((text) => text.trim())).not.toHaveLength(0);
});

test('TC-056 FR-13 recording again discards old text and restarts timing', async ({
  page,
}, info) => {
  await prepareVoice(page, info);
  await startAnswer(page);
  await page.clock.runFor(650);
  await page.getByRole('button', { name: 'Stop and review' }).click();
  await page.clock.runFor(25);
  await page.getByRole('button', { name: 'Record again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep this answer' })).toBeFocused();
  await page.getByRole('dialog').getByRole('button', { name: 'Record again', exact: true }).click();
  await page.clock.runFor(1);
  await expect(page.getByRole('button', { name: 'Stop and review' })).toBeFocused();
  await expect(page.getByText('Start speaking. Your words will appear here.')).toBeVisible();
  await page.clock.runFor(150);
  await page.getByRole('button', { name: 'Stop and review' }).click();
  await page.clock.runFor(25);
  await expect(page.getByLabel('Your answer')).toHaveValue('I led');
  expect(await speech(page).runs()).toBe(2);
  expect(await speech(page).overlaps()).toBe(0);
});

test('TC-056 NFR-14 ending during recording closes recognition', async ({ page }, info) => {
  await prepareVoice(page, info);
  await startAnswer(page);
  await page.clock.runFor(150);
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/);
  expect(await speech(page).active()).toBe(false);
  expect(await speech(page).overlaps()).toBe(0);
});
