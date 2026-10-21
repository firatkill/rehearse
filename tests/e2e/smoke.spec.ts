import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';

for (const port of [3200, 3201, 3202, 3203]) {
  test(`TC-010 T-04 health on port ${port}`, async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
    await page.addInitScript(installSpeechMock, scenarios.happy);
    const response = await page.request.get(`http://localhost:${port}/api/health`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
}
