import { expect, type Page, type TestInfo } from '@playwright/test';
import { installSpeechMock, type SpeechScenario } from './speech-mock';
import { scenarios, serverUrl, uniqueIp } from './helpers';
export async function prepareVoice(
  page: Page,
  info: TestInfo,
  scenario: SpeechScenario = scenarios.happy,
) {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenario);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto(`${serverUrl(info, 1)}/setup`);
  await page.getByRole('button', { name: 'Start session without feedback' }).click();
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeFocused();
  await page.getByRole('button', { name: 'Start the interview' }).click();
}
export async function startAnswer(page: Page) {
  await page.getByRole('button', { name: 'Start answering now' }).click();
  await expect(page.getByRole('button', { name: 'Stop and review' })).toBeFocused();
}
