import { expect, test, type Locator, type Page } from '@playwright/test';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';
import { jobText } from '../fixtures/jobpost';
import { auditV6, reducedMotionV6 } from './v6-audit-helpers';

async function tabTo(page: Page, target: Locator) {
  for (let n = 0; n < 80; n++) {
    if (await target.evaluate((node) => node === document.activeElement)) {
      expect(
        await target.evaluate((node) => {
          const style = getComputedStyle(node);
          return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
        }),
      ).toBe(true);
      return;
    }
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
for (const theme of ['light', 'dark'] as const) {
  test(`TC-188 TC-189 job draft and questions responsive ${theme}`, async ({ page }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    await page.addInitScript((value) => {
      localStorage.setItem('rehearse-theme', value);
    }, theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/setup');
    await tabTo(page, page.getByLabel('Job post link or text'));
    await page.keyboard.insertText(jobText);
    await tabTo(page, page.getByRole('button', { name: 'Read the job post', exact: true }));
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Review the job post', exact: true }),
    ).toBeVisible();
    for (const width of [360, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await auditV6(page);
      await reducedMotionV6(page);
      await page.screenshot({
        path: info.outputPath(`v50-draft-${theme}-${width}.png`),
        fullPage: true,
      });
    }
    await tabTo(page, page.getByRole('button', { name: 'Something wrong? Edit what we read' }));
    await page.keyboard.press('Enter');
    await tabTo(page, page.getByLabel('Edit what we read', { exact: true }));
    await expect(page.getByLabel('Edit what we read', { exact: true })).toBeFocused();
    await auditV6(page);
    await tabTo(page, page.getByRole('button', { name: 'Save text', exact: true }));
    await page.keyboard.press('Enter');
    await tabTo(page, page.getByRole('button', { name: 'Generate questions', exact: true }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('checkbox')).toHaveCount(8);
    await tabTo(page, page.getByRole('checkbox').first());
    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox').first()).not.toBeChecked();
    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    for (const width of [360, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await auditV6(page);
      await reducedMotionV6(page);
      await page.screenshot({
        path: info.outputPath(`v50-questions-${theme}-${width}.png`),
        fullPage: true,
      });
    }
  });
}

test('TC-190 hostile post remains inert and job route has strict security headers', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  const attack =
    '<img src=x onerror="document.body.dataset.executed=1"><script>document.body.dataset.executed=1</script>';
  await page.getByLabel('Job post link or text').fill(`${jobText}\n${attack}`);
  await page.getByRole('button', { name: 'Read the job post', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review the job post', exact: true }),
  ).toBeVisible();
  const response = await page.reload();
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response?.headers()['permissions-policy']).toContain('microphone=(self)');
  expect(await page.locator('body').getAttribute('data-executed')).toBeNull();
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);
});
