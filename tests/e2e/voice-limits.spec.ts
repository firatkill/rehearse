import { expect, test } from '@playwright/test';
import { prepareVoice, startAnswer } from './voice-helpers';
import { scenarios } from './helpers';
test('TC-057 E2E-07 think expiry starts recording and the answer limit stops it', async ({
  page,
}, info) => {
  await prepareVoice(page, info);
  await page.getByRole('button', { name: 'Stop reading' }).click();
  await page.clock.runFor(15000);
  await expect(page.getByRole('button', { name: 'Stop and review' })).toBeVisible();
  await page.clock.runFor(241000);
  await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
  await expect(page.getByText(/Time’s up\. Recording stopped at/)).toBeVisible();
});
test('TC-057 E2E-07 character cap stops and preserves at most 4000 characters', async ({
  page,
}, info) => {
  await prepareVoice(page, info, scenarios.longAnswer);
  await startAnswer(page);
  await page.clock.runFor(200);
  await expect(page.getByText('Recording stopped at the 4,000-character limit.')).toBeVisible();
  expect((await page.getByLabel('Your answer').inputValue()).length).toBe(4000);
});
