import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios, serverUrl } from './helpers';
import { installSpeechMock } from './speech-mock';

for (const offset of [0, 1, 2, 3]) {
  test(`TC-010 T-04 health on server ${offset}`, async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
    await page.addInitScript(installSpeechMock, scenarios.happy);
    const response = await page.request.get(`${serverUrl(testInfo, offset)}/api/health`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
}
