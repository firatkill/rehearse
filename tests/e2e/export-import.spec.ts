import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import fixture from '../fixtures/export-v1.json';
import { ExportFileSchema } from '@/lib/storage/schema';
import { HTTP } from '@/lib/config';
import { uniqueIp, serverUrl, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-099 E2E-18 exports valid token-free JSON and imports into a fresh browser context', async ({
  page,
  browser,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export all sessions' })).toBeDisabled();
  await page
    .getByLabel('Import sessions from a file')
    .setInputFiles(resolve('tests/fixtures/export-v1.json'));
  await expect(
    page.getByText('Imported 1 sessions. Skipped 0 that were already here.'),
  ).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all sessions' }).click();
  const download = await downloading;
  const path = await download.path();
  expect(path).not.toBeNull();
  const content = await readFile(path, 'utf8');
  const exported = ExportFileSchema.parse(JSON.parse(content) as unknown);
  expect(download.suggestedFilename()).toBe(
    `rehearse-export-${exported.exportedAt.slice(0, 10)}.json`,
  );
  expect(exported.sessions[0]?.session).toMatchObject({ token: null, tokenExpiresAt: null });
  await expect(page.getByText('Exported 1 sessions.')).toBeVisible();
  const context = await browser.newContext({
    baseURL: serverUrl(info, 0),
    extraHTTPHeaders: { 'x-real-ip': uniqueIp(info) },
  });
  await context.addInitScript(installSpeechMock, scenarios.noRecognition);
  try {
    const target = await context.newPage();
    await target.goto('/history');
    await expect(target.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
    const upload = {
      name: download.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(content),
    };
    await target.getByLabel('Import sessions from a file').setInputFiles(upload);
    await expect(
      target.getByText('Imported 1 sessions. Skipped 0 that were already here.'),
    ).toBeVisible();
    await expect(
      target.getByRole('table', { name: 'Practice sessions' }).locator('tbody tr'),
    ).toHaveCount(1);
    await target.getByLabel('Import sessions from a file').setInputFiles(upload);
    await expect(
      target.getByText('Imported 0 sessions. Skipped 1 that were already here.'),
    ).toBeVisible();
    await target.getByRole('link', { name: 'Open report' }).click();
    await expect(
      target.getByRole('heading', { name: 'Session report', exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test('TC-100 E2E-18 wrong-format, newer-version and oversize files show exact errors', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/history');
  const input = page.getByLabel('Import sessions from a file');
  await input.setInputFiles({
    name: 'wrong.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.getByText('That file isn’t a Rehearse export.')).toBeVisible();
  await input.setInputFiles({
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...fixture, formatVersion: 2 })),
  });
  await expect(
    page.getByText(
      'That export is from a newer version of Rehearse. Update the page and try again.',
    ),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(HTTP.IMPORT_MAX_BYTES + 1, 120),
  });
  await expect(page.getByText('That file is larger than 5 MB.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
