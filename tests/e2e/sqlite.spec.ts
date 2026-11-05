import { expect, test } from '@playwright/test';
import { startTextSession } from './storage-helpers';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { z } from 'zod';
test('TC-161 full stores an answer on the server across browser contexts', async ({
  page,
  browser,
}, info) => {
  await startTextSession(page, info, true);
  const room = page.url();
  const id = room.split('/').at(-1);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
  await page.getByLabel('Your answer').fill('I saved this answer on my own server.');
  await page.getByRole('button', { name: 'Review answer' }).click();
  // Drive the existing draft debounce while the speech fixture clock is paused.
  await page.clock.runFor(2000);
  const origin = new URL(room).origin;
  const data = async (operation: string) => {
    const response = await page.request.post(`${origin}/api/data`, {
      headers: { origin },
      data: { operation, id },
    });
    expect(response.ok()).toBe(true);
    return response.json() as Promise<unknown>;
  };
  expect(SessionRecordSchema.parse(await data('getSession')).id).toBe(id);
  await expect
    .poll(async () => z.array(AnswerRecordSchema).parse(await data('getAnswers'))[0]?.transcript)
    .toBe('I saved this answer on my own server.');
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto(room);
    await expect(other.getByLabel('Your answer')).toHaveValue(
      'I saved this answer on my own server.',
    );
    await expect(other.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
  } finally {
    await context.close();
    await page.request.post(`${origin}/api/data`, {
      headers: { origin },
      data: { operation: 'deleteSession', id },
    });
  }
});
