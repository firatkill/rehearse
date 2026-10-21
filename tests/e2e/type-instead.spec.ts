import { expect, test } from '@playwright/test';
import { prepareVoice, startAnswer } from './voice-helpers';
import { speech } from './helpers';
test('TC-060 E2E-10 switching mid-recording keeps partial words and future answers use text', async ({
  page,
}, info) => {
  await prepareVoice(page, info);
  await startAnswer(page);
  await page.clock.runFor(150);
  await page.getByRole('button', { name: 'Type instead' }).click();
  await expect(page.getByLabel('Your answer')).toBeFocused();
  await expect(page.getByLabel('Your answer')).toHaveValue('I led');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await expect(page.getByLabel('Your answer')).toBeFocused();
  await page.clock.runFor(2000);
  expect(await speech(page).runs()).toBe(1);
});
