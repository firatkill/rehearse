import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { reportSession } from './report-helpers';
test('TC-077 TC-084 TC-086 E2E-19 report shows scores, summary, Markdown and restores print disclosures', async ({
  page,
}, info) => {
  await reportSession(page, info);
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await expect(page.getByText('Written by the language model from your scores.')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Scores by question and dimension' })).toBeVisible();
  await expect(page.locator('svg[viewBox="0 0 600 200"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByText(/3\/3 answered/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Focus on these next' })).toBeVisible();
  const disclosure = page.locator('details').first();
  await expect(disclosure).not.toHaveAttribute('open');
  await disclosure.locator(':scope > summary').click();
  // NFR-08; NFR-09 / TRD §19.2, §19.4: rendered geometry, not utility-class names.
  const bar = page.locator('[data-score-bar]').first();
  await expect(bar).toHaveCSS('gap', '2px');
  const segments = bar.locator('[data-score-segment]');
  await expect(segments).toHaveCount(4);
  for (const segment of await segments.all()) {
    const bounds = await segment.boundingBox();
    expect(bounds?.width).toBe(12);
    expect(bounds?.height).toBe(6);
  }
  expect(
    await segments.evaluateAll((nodes) =>
      nodes.map((node, index) => {
        const style = getComputedStyle(node);
        const token = getComputedStyle(document.documentElement);
        const expected = document.createElement('span');
        expected.style.color = token.getPropertyValue(index < 2 ? '--accent' : '--rule-strong');
        document.body.append(expected);
        const matches = style.backgroundColor === getComputedStyle(expected).color;
        expected.remove();
        return matches;
      }),
    ),
  ).toEqual([true, true, true, true]);
  for (const target of await page.locator('button:visible, a:visible, summary:visible').all()) {
    const bounds = await target.boundingBox();
    expect(bounds?.height, (await target.textContent()) ?? 'Touch target').toBeGreaterThanOrEqual(
      44,
    );
    expect(bounds?.width, (await target.textContent()) ?? 'Touch target').toBeGreaterThanOrEqual(
      44,
    );
  }
  const prior = await page
    .locator('details')
    .evaluateAll((nodes) => nodes.map((n) => n.hasAttribute('open')));
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  expect(
    await page
      .locator('details')
      .evaluateAll((nodes) => nodes.every((n) => n.hasAttribute('open'))),
  ).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Download Markdown' })).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  expect(
    await page.locator('details').evaluateAll((nodes) => nodes.map((n) => n.hasAttribute('open'))),
  ).toEqual(prior);
  await page.emulateMedia({ media: 'screen' });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^rehearse-\d{4}-\d{2}-\d{2}-.+\.md$/);
  const path = await file.path();
  expect(path).not.toBeNull();
  const content = await readFile(path, 'utf8');
  expect(content).toContain('## Summary');
  expect(content).toContain('## Scores by question');
  expect(content).toContain('> I delivered project 1.');
  await page.getByRole('link', { name: 'Practise again with the same questions' }).click();
  await expect(page).toHaveURL(/\/setup\?seed=[a-f0-9]{8}$/);
  await expect(page.getByLabel('3 questions')).toBeChecked();
  await expect(page.getByLabel('Text: type your answers')).toBeChecked();
});
test('TC-084 E2E-19 saved-only report keeps delivery and omits summary retry', async ({
  page,
}, info) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/summary')) requests++;
  });
  await reportSession(page, info, false);
  await expect(page.getByText('No answers were scored in this session.')).toBeVisible();
  await expect(
    page.getByText(
      'A written summary isn’t available for this session. The numbers below are calculated from your answers.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  expect(requests).toBe(0);
});
