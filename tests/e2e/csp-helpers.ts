import { expect, type Page, type Response } from '@playwright/test';

/** E2E-27 applies to the server response, not strict-dynamic descendants. */
export async function expectResponseNonces(page: Page, response: Response) {
  const policy = response.headers()['content-security-policy'] ?? '';
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy).toContain("'strict-dynamic'");
  const values = await page.evaluate(
    (html) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      return Array.from(document.querySelectorAll('script'), (script) =>
        script.getAttribute('nonce'),
      );
    },
    await response.text(),
  );
  expect(values.length).toBeGreaterThan(0);
  expect(values.every((value) => value === nonce)).toBe(true);
}

export async function watchCsp(page: Page) {
  const violations: string[] = [];
  await page.exposeFunction('reportCspViolation', (directive: string) => {
    violations.push(directive);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const reporter = window as typeof window & {
        reportCspViolation: (directive: string) => Promise<void>;
      };
      void reporter.reportCspViolation(event.effectiveDirective);
    });
  });
  return violations;
}
