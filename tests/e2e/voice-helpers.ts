import { expect, type Page, type TestInfo } from '@playwright/test';
import { installSpeechMock, type SpeechScenario } from './speech-mock';
import { StartResponseSchema } from '@/lib/api/contracts';
import { scenarios, serverUrl, uniqueIp } from './helpers';
export async function prepareVoice(
  page: Page,
  info: TestInfo,
  scenario: SpeechScenario = scenarios.happy,
  feedback = false,
) {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenario);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto(`${serverUrl(info, feedback ? 0 : 1)}/setup`);
  const started = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/sessions/start') && response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: feedback ? 'Start session' : 'Start session without feedback' })
    .click();
  const session = StartResponseSchema.parse(await (await started).json());
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeFocused();
  await page.getByRole('button', { name: 'Start the interview' }).click();
  return session;
}
export async function startAnswer(page: Page) {
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await expect(page.getByRole('button', { name: 'Stop and review' })).toBeFocused();
}
