import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sample from '../../content/sample/session.json';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';

test('TC-097 TC-098 E2E-17 history orders sessions, resumes, opens reports and confirms deletion', async ({
  page,
}, info) => {
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.goto('/history');
  const bundles = [0, 1, 2].map((index) => {
    const id = randomUUID();
    return {
      session: SessionRecordSchema.parse({
        ...sample.session,
        id,
        origin: 'import',
        createdAt: `2026-10-${19 + index}T12:00:00.000Z`,
        status: index === 2 ? 'in_progress' : 'completed',
        summaryStatus: 'unavailable',
        feedback: { enabled: false, reason: 'practice' },
        setup: { ...sample.session.setup, mode: 'text', readAloud: false },
        currentMode: 'text',
        checkpoint: { index: 0, phase: 'intro', at: sample.session.createdAt },
      }),
      answers: sample.answers.map((answer) =>
        AnswerRecordSchema.parse({ ...answer, sessionId: id }),
      ),
    };
  });
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('rehearse');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['sessions', 'answers'], 'readwrite');
        for (const bundle of data) {
          tx.objectStore('sessions').put(bundle.session);
          for (const answer of bundle.answers) tx.objectStore('answers').put(answer);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          reject(new Error('Seed failed'));
        };
      };
    });
    localStorage.setItem('rehearse-theme', 'dark');
    localStorage.setItem('other-project', 'keep');
  }, bundles);
  await page.reload();
  await expect(page).toHaveTitle('History · Rehearse');
  const rows = page.getByRole('table', { name: 'Practice sessions' }).locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).getByRole('cell', { name: 'In progress', exact: true })).toBeVisible();
  await expect(rows.nth(1).getByRole('link', { name: 'Open report' })).toHaveAttribute(
    'href',
    `/session/${bundles[1]?.session.id}/report`,
  );
  await rows.first().getByRole('link', { name: 'Resume' }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${bundles[2]?.session.id}$`));
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
  await page.goto('/history');
  await rows.nth(1).getByRole('link', { name: 'Open report' }).click();
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await page.goto('/history');
  await rows.first().getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Delete this session?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(rows).toHaveCount(3);
  await rows.first().getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete session', exact: true }).click();
  await expect(rows).toHaveCount(2);
  const count = await page.evaluate(
    (id) =>
      new Promise<number>((resolve) => {
        const request = indexedDB.open('rehearse');
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction('answers', 'readonly')
            .objectStore('answers')
            .index('by_sessionId')
            .count(id);
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
        };
      }),
    bundles[2]?.session.id ?? '',
  );
  expect(count).toBe(0);
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.getByRole('button', { name: 'Delete all my data' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete all my data' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByText('All Rehearse data was deleted from this browser.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith('rehearse-')),
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('other-project'))).toBe('keep');
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
  ).not.toContain('rehearse');
});
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
