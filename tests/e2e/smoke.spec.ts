import { expect, test } from '@playwright/test';
import { uniqueIp, scenarios, serverUrl } from './helpers';
import { installSpeechMock } from './speech-mock';
import { HealthResponseSchema } from '../../lib/api/contracts';

for (const offset of [0, 1, 2, 3]) {
  test(`TC-010 T-04 health on server ${offset}`, async ({ page }, testInfo) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(testInfo) });
    await page.addInitScript(installSpeechMock, scenarios.happy);
    const response = await page.request.get(`${serverUrl(testInfo, offset)}/api/health`);
    expect(response.status()).toBe(200);
    const body = HealthResponseSchema.parse(await response.json());
    expect(body.status).toBe('ok');
    expect(body.demoMode).toBe(offset === 1 ? 'readonly' : offset === 2 ? 'off' : 'on');
    expect(body.llmMode).toBe('mock');
    expect(body.rateLimitBackend).toBe('memory');
  });
}
