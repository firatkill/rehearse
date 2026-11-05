import { seedBundle } from './storage-helpers';
import { migrateRecord } from '@/lib/storage/migrations';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sample from '../../content/sample/session.json';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';

export function registerLocaleDates() {
  const parseSession = (value: unknown) => SessionRecordSchema.parse(migrateRecord(value));
  const parseAnswer = (value: unknown) => AnswerRecordSchema.parse(migrateRecord(value));

  test.use({ locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });

  test('TC-132 D-94 Turkish locale keeps sample, history and report dates stable without hydration errors', async ({
    page,
  }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /hydrat|did not match|server rendered/i.test(message.text())
      ) {
        errors.push(message.text());
      }
    });
    await page.goto('/sample');
    await expect(page.getByText(/21 Oct 2026/)).toBeVisible();
    await page.locator('details').first().locator(':scope > summary').click();
    await expect(page.getByRole('heading', { name: 'Feedback on question 1' })).toBeVisible();

    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
    const id = randomUUID();
    const session = parseSession({
      ...sample.session,
      id,
      origin: 'import',
      createdAt: '2026-11-05T23:30:00.000Z',
      token: null,
      tokenExpiresAt: null,
    });
    const answers = sample.answers.map((answer) => parseAnswer({ ...answer, sessionId: id }));
    await seedBundle(page, { session, answers });
    await page.reload();
    await expect(
      page
        .getByRole('table', { name: 'Practice sessions' })
        .getByText('6 Nov 2026, 02:30', { exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Open report' }).click();
    await expect(page).toHaveURL(new RegExp(`/session/${id}/report$`));
    await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
    await expect(page.getByText(/6 Nov 2026, 02:30/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/6 Nov 2026, 02:30/)).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Markdown' }).click();
    expect((await download).suggestedFilename()).toContain('2026-11-05');
    expect(errors).toEqual([]);
  });
}
