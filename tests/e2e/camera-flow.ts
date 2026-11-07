import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { installSpeechMock } from './speech-mock';
import { installCameraMock } from './camera-mock';
import { scenarios, uniqueIp } from './helpers';
export async function cameraFlow(page: Page, info: TestInfo, denied = false) {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript({
    content: `(${installSpeechMock.toString()})(${JSON.stringify(scenarios.noRecognition)});(${installCameraMock.toString()})(${JSON.stringify(denied)});`,
  });
  const response = await page.goto('/setup');
  expect(response?.headers()['permissions-policy']).toContain('camera=(self)');
  expect(response?.headers()['permissions-policy']).toContain('microphone=(self)');
  const camera = () =>
    page.evaluate(() => {
      const state = (
        window as unknown as {
          __camera: {
            requested: MediaStreamConstraints[];
            stopped: number;
            tracks: { readyState: string }[];
          };
        }
      ).__camera;
      return {
        requested: state.requested,
        stopped: state.stopped,
        live: state.tracks.filter((track) => track.readyState === 'live').length,
      };
    });
  const toggle = page.getByRole('checkbox', { name: 'Show my camera', exact: true });
  await expect(toggle).not.toBeChecked();
  expect((await camera()).requested).toEqual([]);
  await toggle.focus();
  await page.keyboard.press('Space');
  if (denied) {
    await expect(
      page.getByText('Your camera is unavailable. You can keep practising without it.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Start the interview', exact: true }),
    ).toBeVisible();
    return;
  }
  await expect(page.getByLabel('Your mirrored camera preview')).toBeVisible();
  await expect.poll(async () => (await camera()).live).toBe(1);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect((await camera()).requested).toEqual([{ video: true }]);
  await expect(page.getByLabel('Your mirrored camera preview')).toHaveCSS(
    'transform',
    'matrix(-1, 0, 0, 1, 0, 0)',
  );
  await toggle.uncheck();
  await expect.poll(async () => (await camera()).live).toBe(0);
  await toggle.check();
  await expect.poll(async () => (await camera()).live).toBe(1);
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start the interview', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Show my camera', exact: true })).toBeChecked();
  await expect.poll(async () => (await camera()).stopped).toBe(2);
  await expect.poll(async () => (await camera()).live).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(async () => (await camera()).live).toBe(0);
  await page.getByRole('checkbox', { name: 'Show my camera', exact: true }).check();
  await expect.poll(async () => (await camera()).live).toBe(1);
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await expect.poll(async () => (await camera()).live).toBe(0);
  await expect(
    page.getByRole('checkbox', { name: 'Show my camera', exact: true }),
  ).not.toBeChecked();
}
