import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { QuestionSchema } from '@/lib/questions/schema';
import { StartRequestSchema, StartResponseSchema } from '@/lib/api/contracts';
import { seedLocalSession } from './local-session-helpers';
import { uniqueIp, scenarios } from './helpers';
import { installSpeechMock } from './speech-mock';
test('TC-151 V-24 report starts three dimension-tagged questions for the same role and seniority', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/progress');
  const original = await seedLocalSession(page);
  await page.goto(`/session/${original}/report`);
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/sessions/start') && r.method() === 'POST',
  );
  const response = page.waitForResponse((r) => r.url().endsWith('/api/sessions/start'));
  await page.getByRole('button', { name: 'Practise Specificity · 3 questions' }).click();
  const body = StartRequestSchema.parse((await request).postDataJSON());
  expect(body).toMatchObject({
    dimension: 'specificity',
    length: 3,
    role: 'full-stack',
    seniority: 'mid',
  });
  const data = StartResponseSchema.parse(await (await response).json());
  const bank = (
    await Promise.all(
      ['behavioral', 'technical-concepts', 'system-design-lite'].map(async (file) =>
        QuestionSchema.array().parse(
          JSON.parse(await readFile(`content/questions/${file}.json`, 'utf8')),
        ),
      ),
    )
  ).flat();
  expect(data.questions).toHaveLength(3);
  for (const q of data.questions) {
    const source = bank.find((item) => item.id === q.id);
    expect(source?.dimensions).toContain('specificity');
    expect(source?.roles).toContain('full-stack');
    expect(source?.seniority).toContain('mid');
  }
  await expect(page).toHaveURL(new RegExp(`/session/${data.sessionId}$`));
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeVisible();
  const invalid = await page.request.post('/api/sessions/start', {
    data: { ...body, dimension: 'invented' },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(invalid.status()).toBe(400);
});
