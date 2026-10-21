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

test('TC-057 E2E-07 each remaining-time announcement appears once before the exact answer limit', async ({
  page,
}, info) => {
  const session = await prepareVoice(page, info);
  const limit = session.questions[0]!.time_limit_s;
  await startAnswer(page);
  const messages: string[] = [];
  await page.exposeFunction('recordAnnouncement', (text: string) => {
    messages.push(text);
  });
  await page.evaluate(() => {
    const record = (window as unknown as { recordAnnouncement: (text: string) => Promise<void> })
      .recordAnnouncement;
    const region = document.querySelector('main [role="status"]');
    if (!region) throw new Error('Missing visible room status');
    new MutationObserver(() => {
      void record(region.textContent);
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });
  let elapsed = 0;
  for (const threshold of [60, 30, 10].filter((value) => value < limit)) {
    const next = (limit - threshold) * 1000 + 100;
    await page.clock.runFor(next - elapsed);
    elapsed = next;
    const text = threshold === 60 ? '1 minute left.' : `${threshold} seconds left.`;
    await expect(page.locator('main').getByRole('status')).toHaveText(text);
  }
  await page.clock.runFor(limit * 1000 - elapsed + 30);
  await expect(page.getByRole('heading', { name: 'Review your answer' })).toBeVisible();
  for (const text of ['1 minute left.', '30 seconds left.', '10 seconds left.']) {
    expect(messages.filter((message) => message === text)).toHaveLength(
      text === '1 minute left.' && limit === 60 ? 0 : 1,
    );
  }
});
