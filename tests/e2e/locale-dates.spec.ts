import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sample from '../../content/sample/session.json';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';

test.use({ locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });

test('TC-124 V-01 Turkish locale keeps sample, history and report dates stable without hydration errors', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydrat|did not match|server rendered/i.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  await page.goto('/sample');
  await expect(page.getByText(/21 Oct 2026/)).toBeVisible();
  await page.locator('details').first().locator(':scope > summary').click();
  await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeVisible();

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
  const id = randomUUID();
  const session = SessionRecordSchema.parse({
    ...sample.session,
    id,
    origin: 'import',
    createdAt: '2026-11-05T23:30:00.000Z',
    token: null,
    tokenExpiresAt: null,
  });
  const answers = sample.answers.map((answer) =>
    AnswerRecordSchema.parse({ ...answer, sessionId: id }),
  );
  await page.evaluate(
    async (bundle) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('rehearse');
        request.onerror = () => {
          reject(new Error('Could not open test storage'));
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['sessions', 'answers'], 'readwrite');
          tx.objectStore('sessions').put(bundle.session);
          for (const answer of bundle.answers) tx.objectStore('answers').put(answer);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(new Error('Could not seed test session'));
          };
        };
      });
    },
    { session, answers },
  );
  await page.reload();
  await expect(page.getByText('5 Nov 2026, 23:30 UTC', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Open report' }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${id}/report$`));
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await expect(page.getByText(/5 Nov 2026/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/5 Nov 2026/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  expect((await download).suggestedFilename()).toContain('2026-11-05');
  expect(errors).toEqual([]);
});
