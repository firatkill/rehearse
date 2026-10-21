import { expect, test } from '@playwright/test';
import { startTextSession, storedRoom } from './storage-helpers';
const notSaving =
  'This browser isn’t saving sessions, so they will be lost when you close the tab. Private windows in some browsers block storage.';
test('TC-094 E2E-23 unavailable IndexedDB still completes a text session in memory', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined });
  });
  await startTextSession(page, info, true);
  await expect(page.getByText(notSaving)).toBeVisible();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Start answering now' }).click();
    await page.getByLabel('Your answer').fill(`I saved answer ${i + 1}.`);
    await page.getByRole('button', { name: 'Review answer' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page
      .getByRole('button', { name: i === 2 ? 'Finish and see report' : 'Next question' })
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await expect(page.getByText('3/3 answered', { exact: false })).toBeVisible();
});
test('TC-096 FR-39 failed write retains the current answer in memory and shows only not-saving', async ({
  page,
}, info) => {
  await startTextSession(page, info, true);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('I retained my answer.');
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Review answer' }).click();
  await expect(page.getByText(notSaving)).toBeVisible();
  await expect(page.getByLabel('Your answer')).toHaveValue('I retained my answer.');
  await expect(
    page.getByText('Rehearse was updated in another tab.', { exact: false }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
});
test('TC-096 FR-35 versionchange closes storage and shows only updated-elsewhere', async ({
  page,
}, info) => {
  await startTextSession(page, info, true);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await page.getByLabel('Your answer').fill('I keep this after an upgrade.');
  await page.clock.runFor(2000);
  await expect
    .poll(async () => (await storedRoom(page)).answers[0]?.transcript)
    .toBe('I keep this after an upgrade.');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('rehearse', 2);
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
        request.onerror = () => {
          reject(new Error('Upgrade failed'));
        };
      }),
  );
  await expect(
    page.getByText('Rehearse was updated in another tab.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Review answer' }).click();
  await expect(page.getByLabel('Your answer')).toHaveValue('I keep this after an upgrade.');
  await expect(page.getByText(notSaving)).toHaveCount(0);
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
});
