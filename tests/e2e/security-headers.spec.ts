import { expectResponseNonces, watchCsp } from './csp-helpers';
import { jobText } from '../fixtures/jobpost';
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
    await expectResponseNonces(page, response!);
  }
  expect(nonces[0]).not.toBe(nonces[1]);
});

test('TC-195 E2E-27 server nonces and zero runtime CSP violations through the job room', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  const violations = await watchCsp(page);
  for (const path of ['/', '/setup']) {
    await expectResponseNonces(page, (await page.goto(path))!);
    await expect(page.locator('main h1')).toBeVisible();
    expect(violations).toEqual([]);
  }
  await page.getByLabel('Job post link or text').fill(jobText);
  await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review the job post', exact: true }),
  ).toBeVisible();
  await expectResponseNonces(page, (await page.reload())!);
  await page.getByRole('button', { name: 'Analyse the job post', exact: true }).click();
  await page.getByRole('button', { name: 'Generate questions', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(8);
  expect(violations).toEqual([]);
  await page.getByRole('button', { name: 'Start with 5 questions' }).click();
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
  await expectResponseNonces(page, (await page.reload())!);
  await page.getByRole('button', { name: 'Start the interview' }).click();
  await page.getByRole('button', { name: /^(I’m ready to answer|Start now)$/ }).click();
  await page
    .getByLabel('Your answer')
    .fill(
      'I built an accessible operator dashboard and reduced investigation time by 25 percent. I measured the change with operations staff.',
    );
  await page.getByRole('button', { name: 'Review answer' }).click();
  await page.getByRole('button', { name: 'Get feedback' }).click();
  await expect(
    page.getByRole('heading', { name: 'Feedback on question 1', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep going', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(violations).toEqual([]);
});
