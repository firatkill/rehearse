import { seedBundle } from './storage-helpers';
import { migrateRecord } from '@/lib/storage/migrations';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sample from '../../content/sample/session.json';
import { SessionRecordSchema, AnswerRecordSchema } from '@/lib/storage/schema';
import { installSpeechMock } from './speech-mock';
import { scenarios, uniqueIp } from './helpers';

export function registerHistory() {
  const parseSession = (value: unknown) => SessionRecordSchema.parse(migrateRecord(value));
  const parseAnswer = (value: unknown) => AnswerRecordSchema.parse(migrateRecord(value));

  test('TC-097 TC-098 E2E-17 history orders sessions, resumes, opens reports and confirms deletion', async ({
    page,
  }, info) => {
    await page.addInitScript(installSpeechMock, scenarios.noRecognition);
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.goto('/history');
    const bundles = [0, 1, 2].map((index) => {
      const id = randomUUID();
      return {
        session: parseSession({
          ...sample.session,
          id,
          origin: 'import',
          createdAt: `2026-10-${19 + index}T12:00:00.000Z`,
          status: index === 2 ? 'in_progress' : 'completed',
          summaryStatus: 'unavailable',
          feedback: { enabled: false, reason: 'practice' },
          setup: { ...sample.session.setup, mode: 'text', readAloud: false },
          currentMode: 'text',
          checkpoint: { index: 0, phase: 'intro', at: sample.session.createdAt },
        }),
        answers: sample.answers.map((answer) => parseAnswer({ ...answer, sessionId: id })),
      };
    });
    for (const bundle of bundles) await seedBundle(page, bundle);
    await page.evaluate(() => {
      localStorage.setItem('rehearse-theme', 'dark');
      localStorage.setItem('other-project', 'keep');
    });
    await page.reload();
    await expect(page).toHaveTitle('Progress · Rehearse');
    const rows = page.getByRole('table', { name: 'Practice sessions' }).locator('tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByRole('cell', { name: 'In progress', exact: true })).toBeVisible();
    await expect(rows.nth(1).getByRole('link', { name: 'Open report' })).toHaveAttribute(
      'href',
      `/session/${bundles[1]?.session.id}/report`,
    );
    await rows.first().getByRole('link', { name: 'Resume' }).click();
    await expect(page).toHaveURL(new RegExp(`/session/${bundles[2]?.session.id}$`));
    await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
    await page.goto('/history');
    await rows.nth(1).getByRole('link', { name: 'Open report' }).click();
    await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
    await page.goto('/history');
    await rows.first().getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Delete this session?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(rows).toHaveCount(3);
    await rows.first().getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete session', exact: true }).click();
    await expect(rows).toHaveCount(2);
    const origin = new URL(page.url()).origin;
    const deletedAnswers = await page.request.post(`${origin}/api/data`, {
      headers: { origin },
      data: { operation: 'getAnswers', id: bundles[2]?.session.id },
    });
    expect(await deletedAnswers.json()).toEqual([]);

    await page.setViewportSize({ width: 360, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );
    await page.getByRole('button', { name: 'Delete all my data' }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(rows).toHaveCount(2);
    await page.getByRole('button', { name: 'Delete all my data' }).click();
    await page.getByRole('button', { name: 'Delete everything' }).click();
    await expect(page.getByText('All Rehearse data was deleted from this server.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No sessions yet' })).toBeVisible();
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.startsWith('rehearse-')),
      ),
    ).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('other-project'))).toBe('keep');
    expect(
      await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
    ).not.toContain('rehearse');
  });
}
