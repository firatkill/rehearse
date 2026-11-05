import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-116 E2E-27 fresh nonces and required security headers', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const nonces: string[] = [];
  for (let n = 0; n < 2; n++) {
    const response = await page.goto('/setup');
    const headers = response!.headers(),
      policy = headers['content-security-policy'] ?? '';
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    nonces.push(nonce ?? '');
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy.split('script-src')[1]?.split(';')[0]).not.toContain("'unsafe-inline'");
    expect(headers['permissions-policy']).toContain('microphone=(self)');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
    const values = await page
      .locator('script')
      .evaluateAll((elements) => elements.map((element) => element.nonce));
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === nonce)).toBe(true);
  }
  expect(nonces[0]).not.toBe(nonces[1]);
});
