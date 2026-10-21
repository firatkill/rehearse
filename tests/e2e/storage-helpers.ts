import { expect, type Page, type TestInfo } from '@playwright/test';
import { installSpeechMock } from './speech-mock';
import { scenarios, serverUrl, uniqueIp } from './helpers';
import type { AnswerRecord, SessionRecord } from '@/lib/storage/schema';
export async function startTextSession(page: Page, info: TestInfo, readonly = false) {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto(`${serverUrl(info, readonly ? 1 : 0)}/setup`);
  await page.getByLabel('Text: type your answers').check();
  await page.getByLabel('3 questions').check();
  await page
    .getByRole('button', {
      name: readonly ? 'Start session without feedback' : 'Start session',
      exact: true,
    })
    .click();
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeFocused();
}
export async function storedRoom(page: Page) {
  return page.evaluate(async () => {
    const id = location.pathname.split('/')[2] ?? '';
    return new Promise<{ session: SessionRecord; answers: AnswerRecord[] }>((resolve, reject) => {
      const request = indexedDB.open('rehearse');
      request.onerror = () => {
        reject(new Error('Storage read failed'));
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['sessions', 'answers'], 'readonly');
        const session = tx.objectStore('sessions').get(id);
        const answers = tx.objectStore('answers').index('by_sessionId').getAll(id);
        tx.oncomplete = () => {
          db.close();
          resolve({
            session: session.result as SessionRecord,
            answers: answers.result as AnswerRecord[],
          });
        };
        tx.onabort = () => {
          db.close();
          reject(new Error('Storage transaction failed'));
        };
      };
    });
  });
}
