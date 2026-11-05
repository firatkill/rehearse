import { z } from 'zod';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
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
  const id = new URL(page.url()).pathname.split('/')[2] ?? '';
  const origin = new URL(page.url()).origin;
  const read = async (operation: string) => {
    const response = await page.request.post(`${origin}/api/data`, {
      headers: { origin },
      data: { operation, id },
    });
    expect(response.ok()).toBe(true);
    return response.json() as Promise<unknown>;
  };
  return {
    session: SessionRecordSchema.parse(await read('getSession')),
    answers: z.array(AnswerRecordSchema).parse(await read('getAnswers')),
  };
}
export async function seedBundle(
  page: Page,
  bundle: { session: SessionRecord; answers: AnswerRecord[] },
) {
  const origin = new URL(page.url()).origin;
  for (const data of [
    { operation: 'createSession', session: bundle.session },
    ...bundle.answers.map((answer) => ({ operation: 'putAnswer', answer })),
  ]) {
    const response = await page.request.post(`${origin}/api/data`, { headers: { origin }, data });
    expect(response.ok()).toBe(true);
  }
}
