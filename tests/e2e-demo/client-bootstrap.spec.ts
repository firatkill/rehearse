import { expect, test } from '@playwright/test';
import { scenarios, uniqueIp } from '../e2e/helpers';
import { installSpeechMock } from '../e2e/speech-mock';
test('TC-193 strict CSP has no eval probe and the brand icon resolves', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const issues: string[] = [];
  const client = await page.context().newCDPSession(page);
  await client.send('Audits.enable');
  client.on('Audits.issueAdded', (event: { issue: { code: string } }) => {
    issues.push(event.issue.code);
  });
  for (const path of ['/', '/setup', '/sample']) {
    const response = await page.goto(path);
    expect(response?.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
    await expect(page.locator('main h1')).toBeVisible();
    const icon = await page.locator('link[rel="icon"]').first().getAttribute('href');
    expect(icon).toBeTruthy();
    expect((await page.request.get(icon ?? '')).status()).toBe(200);
  }
  expect(issues).not.toContain('ContentSecurityPolicyIssue');
});

test('TC-196 landing response scripts exclude deferred libraries and package metadata', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const response = await page.goto('/');
  const paths = await page.evaluate(
    (html) =>
      Array.from(
        new DOMParser().parseFromString(html, 'text/html').querySelectorAll('script[src]'),
        (script) => script.getAttribute('src')!,
      ),
    await response!.text(),
  );
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    const asset = await page.request.get(path);
    expect(asset.status()).toBe(200);
    const code = await asset.text();
    for (const signature of [
      'ZodError',
      'onupgradeneeded',
      'SlotClone',
      'demo:generate',
      'better-sqlite3',
    ]) {
      expect(code, `${path} unexpectedly includes ${signature}`).not.toContain(signature);
    }
  }
});
