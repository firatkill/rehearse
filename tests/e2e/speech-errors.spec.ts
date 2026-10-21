import { expect, test } from '@playwright/test';
import { prepareVoice, startAnswer } from './voice-helpers';
import { scenarios, speech } from './helpers';
test('TC-058 E2E-08 permission denial offers focused text fallback', async ({ page }, info) => {
  await prepareVoice(page, info, scenarios.micDenied);
  await expect(page.getByRole('heading', { name: 'Microphone access is blocked' })).toBeVisible();
  await expect(page.locator('main [aria-live=assertive]')).toHaveText(
    'Microphone access is blocked',
  );
  await expect(page.getByRole('button', { name: 'Type instead' })).toBeFocused();
  await page.getByRole('button', { name: 'Type instead' }).click();
  await expect(page.getByLabel('Your answer')).toBeFocused();
  expect(await speech(page).runs()).toBe(0);
});
test('TC-058 E2E-08 three empty no-speech runs show retry; click starts a new run', async ({
  page,
}, info) => {
  await prepareVoice(page, info, scenarios.noSpeech);
  await startAnswer(page);
  await page.clock.runFor(1000);
  await expect(page.getByRole('heading', { name: 'We didn’t hear anything' })).toBeVisible();
  expect(await speech(page).runs()).toBe(3);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  await page.getByRole('button', { name: 'Try again' }).click();
  expect(await speech(page).runs()).toBe(4);
});
for (const hasWords of [true, false])
  test(`TC-058 E2E-08 network error ${hasWords ? 'keeps words in review' : 'offers text fallback'}`, async ({
    page,
  }, info) => {
    await prepareVoice(
      page,
      info,
      hasWords ? scenarios.networkAfterWords : scenarios.networkNoWords,
    );
    await startAnswer(page);
    await page.clock.runFor(300);
    if (hasWords) {
      await expect(
        page.getByText('Speech recognition lost its connection. Your words so far are below.'),
      ).toBeVisible();
      await expect(page.getByLabel('Your answer')).toHaveValue('I led the project');
    } else
      await expect(
        page.getByRole('heading', { name: 'Speech recognition isn’t available right now' }),
      ).toBeVisible();
  });
