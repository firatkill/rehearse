import { expect, test } from '@playwright/test';
import { startTextSession, storedRoom } from './storage-helpers';
test('TC-095 E2E-16 saved text draft and review edits survive reload with restored notice', async ({
  page,
}, info) => {
  await startTextSession(page, info);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('I restored a useful answer.');
  await page.clock.runFor(2000);
  await expect
    .poll(async () => (await storedRoom(page)).answers[0]?.transcript)
    .toBe('I restored a useful answer.');
  await page.reload();
  await expect(page.getByLabel('Your answer')).toBeVisible();
  await page.clock.runFor(50);
  await expect(page.getByText('We restored your answer after the page reloaded.')).toBeVisible();
  await expect(page.getByLabel('Your answer')).toHaveValue('I restored a useful answer.');
  await page.getByLabel('Your answer').fill('I restored and edited the answer.');
  await page.clock.runFor(500);
  await expect
    .poll(async () => (await storedRoom(page)).answers[0]?.transcript)
    .toBe('I restored and edited the answer.');
  await page.reload();
  await expect(page.getByLabel('Your answer')).toHaveValue('I restored and edited the answer.');
});
test('TC-095 E2E-16 thinking resumes only after Continue and scored feedback survives reload', async ({
  page,
}, info) => {
  await startTextSession(page, info);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await expect(page.getByRole('button', { name: 'Start answering now' })).toBeVisible();
  await page.clock.runFor(2000);
  await expect.poll(async () => (await storedRoom(page)).session.checkpoint.phase).toBe('thinking');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ready to continue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('I delivered a useful project.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Get feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeVisible();
  await expect.poll(async () => (await storedRoom(page)).session.checkpoint.phase).toBe('feedback');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
});
