import { migrateRecord } from '@/lib/storage/migrations';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import sample from '../../content/sample/session.json';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
const parseSession = (value: unknown) => SessionRecordSchema.parse(migrateRecord(value));
const parseAnswer = (value: unknown) => AnswerRecordSchema.parse(migrateRecord(value));

export async function seedLocalSession(page: Page, active = false): Promise<string> {
  const id = randomUUID();
  const session = parseSession({
    ...sample.session,
    id,
    origin: 'import',
    status: active ? 'in_progress' : 'completed',
    completedAt: active ? null : sample.session.completedAt,
    feedback: { enabled: false, reason: 'practice' },
    setup: { ...sample.session.setup, mode: 'text', readAloud: false },
    currentMode: 'text',
    checkpoint: { index: 0, phase: 'intro', at: sample.session.createdAt },
  });
  const answers = sample.answers.map((answer) => parseAnswer({ ...answer, sessionId: id }));
  await page.evaluate(
    async (bundle) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('rehearse');
        request.onerror = () => {
          reject(new Error('Seed database unavailable'));
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
            reject(new Error('Seed transaction failed'));
          };
        };
      });
    },
    { session, answers },
  );
  return id;
}
