import { expect } from '@playwright/test';
import { test } from '../setup/cap-server';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp, speech } from './helpers';
export function registerProviderVoices() {
  test.describe('Provider speech @isolated', () => {
    test.use({ ttsProvider: 'openai' });
    test('TC-224 provider preview, playback sequencing and failure fallback @isolated', async ({
      page,
      capOrigin,
    }, info) => {
      await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
      await page.addInitScript(installSpeechMock, scenarios.happy);
      await page.addInitScript(() => {
        const audio: HTMLMediaElement[] = [];
        Object.defineProperty(window, '__providerAudio', { value: audio });
        HTMLMediaElement.prototype.play = function () {
          if (this.volume === 1) audio.push(this);
          return Promise.resolve();
        };
        HTMLMediaElement.prototype.pause = function () {
          this.dataset.stopped = 'true';
        };
      });
      await page.goto(`${capOrigin}/setup`);
      await page.getByLabel('Voice: answer out loud').check();
      const preview = page.waitForResponse('**/api/tts');
      await page.getByRole('button', { name: 'Preview voice', exact: true }).click();
      expect((await preview).status()).toBe(200);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { __providerAudio: HTMLMediaElement[] }).__providerAudio.length,
          ),
        )
        .toBe(1);
      await page.evaluate(() =>
        (window as unknown as { __providerAudio: HTMLMediaElement[] }).__providerAudio
          .at(-1)
          ?.dispatchEvent(new Event('ended')),
      );
      await page.getByRole('button', { name: 'Start session', exact: true }).click();
      await page.getByRole('button', { name: 'Start the interview', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { __providerAudio: HTMLMediaElement[] }).__providerAudio.length,
          ),
        )
        .toBe(2);
      expect(await speech(page).runs()).toBe(0);
      await page.evaluate(() =>
        (window as unknown as { __providerAudio: HTMLMediaElement[] }).__providerAudio
          .at(-1)
          ?.dispatchEvent(new Event('ended')),
      );
      await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
      await expect.poll(async () => await speech(page).runs()).toBe(1);
      expect(await speech(page).overlaps()).toBe(0);
      await page.getByRole('button', { name: 'Stop and review' }).click();
      await page
        .getByLabel('Your answer')
        .fill('I led the project and measured the result with the team.');
      await page.getByRole('button', { name: 'Get feedback', exact: true }).click();
      await page.route('**/api/tts', (route) =>
        route.fulfill({ status: 502, contentType: 'application/json', body: '{}' }),
      );
      await page.getByRole('button', { name: 'Next question', exact: true }).click();
      await expect(
        page.getByText(
          'The provider voice is unavailable. Using browser speech for this question.',
          { exact: true },
        ),
      ).toBeVisible();
      await expect.poll(async () => (await speech(page).spoken()).length).toBeGreaterThan(1);
      expect(await speech(page).overlaps()).toBe(0);
    });
  });
}
