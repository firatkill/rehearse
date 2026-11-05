import { expect, test } from '@playwright/test';
import { installSpeechMock } from '../e2e/speech-mock';
import { scenarios, uniqueIp } from '../e2e/helpers';
test('TC-098 FR-38 blocked delete uses one request and succeeds when the old tab closes', async ({
  page,
  context,
}, info) => {
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
  const other = await context.newPage();
  await other.addInitScript(installSpeechMock, scenarios.noRecognition);
  await other.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await other.goto('/sample');
  await other.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.open('rehearse');
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {};
          Object.defineProperty(window, 'closeOldStorage', {
            value: () => {
              db.close();
            },
          });
          resolve();
        };
      }),
  );
  await page.evaluate(() => {
    let count = 0;
    const remove = indexedDB.deleteDatabase.bind(indexedDB);
    indexedDB.deleteDatabase = (name) => {
      count++;
      return remove(name);
    };
    Object.defineProperty(window, 'deleteRequests', { get: () => count });
  });
  try {
    await page.getByRole('button', { name: 'Delete all my data' }).click();
    await page.getByRole('button', { name: 'Delete everything' }).click();
    await expect(page.getByText('Close other Rehearse tabs to finish deleting.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete all my data' })).toBeDisabled();
    await other.evaluate(() => {
      const control = window as unknown as { closeOldStorage: () => void };
      control.closeOldStorage();
    });
    await expect(page.getByText('All Rehearse data was deleted from this browser.')).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, 'deleteRequests') as unknown)).toBe(1);
  } finally {
    await other.close();
  }
});
