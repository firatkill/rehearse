import { expect, test } from '@playwright/test';
import { PERFORMANCE } from '@/lib/config';
import { installSpeechMock } from '../e2e/speech-mock';
import { scenarios, uniqueIp } from '../e2e/helpers';

test('TC-194 mocked recognition result reaches a rendered frame within budget', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, { ...scenarios.happy, runs: [] });
  await page.goto('/setup');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: 'Start the interview', exact: true }).click();
  await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
  await expect(page.getByRole('button', { name: 'Stop and review', exact: true })).toBeFocused();
  const timings: number[] = [];
  for (let n = 0; n < 5; n++) {
    const elapsed = await page.getByRole('region', { name: 'Live transcript' }).evaluate(
      (element, index) =>
        new Promise<number>((resolve, reject) => {
          const control = (
            window as unknown as {
              __speech: { active: { emit(text: string, final: boolean): void } | null };
            }
          ).__speech.active;
          if (!control) {
            reject(new Error('Mock recognition must be active'));
            return;
          }
          const text = `Measured practice result ${index}`;
          const start = performance.now();
          const observer = new MutationObserver(() => {
            if (element.textContent.includes(text)) {
              observer.disconnect();
              requestAnimationFrame(() => {
                resolve(performance.now() - start);
              });
            }
          });
          observer.observe(element, { childList: true, subtree: true, characterData: true });
          control.emit(text, false);
        }),
      n,
    );
    timings.push(elapsed);
    expect(elapsed).toBeLessThanOrEqual(PERFORMANCE.RESULT_TO_SCREEN_MS);
  }
  await info.attach('mock-result-to-frame-ms', {
    body: JSON.stringify(timings),
    contentType: 'application/json',
  });
});
