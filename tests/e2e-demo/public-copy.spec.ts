import { expect, test } from '@playwright/test';
import { uniqueIp } from '../e2e/helpers';

test('TC-203 demo public copy describes shipped features and browser-stored history', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  for (const route of ['/', '/how-it-works', '/privacy']) {
    await page.goto(route);
    await expect(page.locator('main')).not.toContainText(
      /This preview|planned public demo|planned, not active|release preview|being built|English and Turkish/,
    );
    if (route === '/') {
      await expect(
        page.getByRole('table', { name: 'Demo and self-hosted editions' }),
      ).toBeVisible();
      await expect(page.getByText(/or try one of three example job posts/)).toBeVisible();
    } else if (route === '/how-it-works') {
      await expect(page.getByText(/You are using the demo: feedback is pre-written/)).toBeVisible();
      await expect(
        page.getByText(/The browser stores sessions, answers and sample feedback in IndexedDB/),
      ).toBeVisible();
      await expect(page.getByText(/latency has not been formally measured/)).toBeVisible();
    } else {
      await expect(page.getByText('You are using the public demo.')).toBeVisible();
      await expect(
        page.getByText(/your answer is sent to the demo server to select an example/),
      ).toBeVisible();
    }
  }
});
