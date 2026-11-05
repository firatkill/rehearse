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
