import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { installSpeechMock } from './speech-mock';
import { scenarios, speech, uniqueIp } from './helpers';
import { messages as english } from '@/messages/en-complete';
import { messages as turkish } from '@/messages/tr';
import { StartResponseSchema } from '@/lib/api/contracts';

// Compare static text nodes and accessible strings against the complete English catalogue.
async function expectTurkishOnly(page: Page) {
  const properNames = new Set([
    'Rehearse',
    'GitHub',
    'firatkil.com',
    'Frontend',
    'Backend',
    'Full-stack',
    'DEMO',
  ]);
  const forbidden = Object.entries(english)
    .filter(([key, value]) => {
      const translated = turkish[key as keyof typeof turkish];
      return (
        /[A-Za-z]/.test(value) &&
        value.trim().length >= 3 &&
        !value.includes('{') &&
        value !== translated &&
        !properNames.has(value.trim())
      );
    })
    .map(([, value]) => value.trim());
  const leaked = await page.evaluate((words) => {
    const strings: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (parent && !parent.closest('script, style, noscript'))
        strings.push(walker.currentNode.textContent?.trim() ?? '');
    }
    for (const element of document.querySelectorAll('[aria-label], [placeholder], [title]'))
      for (const attr of ['aria-label', 'placeholder', 'title'])
        strings.push(element.getAttribute(attr)?.trim() ?? '');
    return strings.filter((text) => words.includes(text));
  }, forbidden);
  expect(leaked).toEqual([]);
}
const answer =
  'Geçen ay ekipte kayıt akışını inceledim. Kullanıcıların aynı işlemi iki kez yaptığını gördüm. Önce hatayı yeniden ürettim, sonra sunucuda kontrol ekledim. Sonuçları iki hafta ölçtüm ve tekrar sayısı 12 yerine 2 oldu. Şey, bu değişikliği ekiple paylaştım.';
async function beginAnswer(page: Page) {
  await page.getByRole('button', { name: /^(Yanıtlamaya hazırım|Şimdi başla)$/ }).click();
}
async function submitText(page: Page, text: string) {
  await page.getByLabel('Yanıtın', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Yanıtı gözden geçir', exact: true }).click();
  await page.getByRole('button', { name: 'Geri bildirim al', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Geri bildirim: soru 1', exact: true }),
  ).toBeVisible();
}
for (const mode of ['text', 'voice'] as const) {
  test(`TC-206 TC-209 TC-211 TC-214 TC-215 full Turkish ${mode} session persists through feedback, report and progress`, async ({
    page,
  }, info) => {
    await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
    await page.addInitScript(installSpeechMock, {
      ...scenarios.happy,
      voices: [
        ...scenarios.happy.voices,
        {
          name: 'Test Türkçe',
          lang: 'tr-TR',
          voiceURI: 'test-tr',
          localService: true,
          default: false,
        },
      ],
      runs: [[{ after: 100, text: answer, final: true }]],
    });
    const now = Date.now();
    await page.clock.install({ time: new Date(now) });
    await page.clock.pauseAt(new Date(now + 1000));
    await page.goto('/setup');
    await page.getByLabel('Türkçe', { exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page).toHaveTitle('Oturum ayarları · Rehearse');
    await expectTurkishOnly(page);
    await page.getByLabel('3 soru (yaklaşık 10 dakika)', { exact: true }).check();
    await page
      .getByLabel(mode === 'text' ? 'Yazılı: yanıtını yaz' : 'Sesli: yanıtını söyle', {
        exact: true,
      })
      .check();
    if (mode === 'text') await page.getByLabel('Soruları sesli oku', { exact: true }).uncheck();
    const started = page.waitForResponse(
      (r) => r.url().endsWith('/api/sessions/start') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Oturum başlat', exact: true }).click();
    const session = StartResponseSchema.parse(await (await started).json());
    expect(session.questions.every((q) => /^(beh|tec|sdl)-5/.test(q.id))).toBe(true);
    await expect(page.getByRole('button', { name: 'Mülakata başla', exact: true })).toBeVisible();
    await expect(page).toHaveTitle('Mülakat · Rehearse');
    await expectTurkishOnly(page);
    await page.getByRole('button', { name: 'Oturumu bitir', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kapat', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Kapat', exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await page.getByRole('button', { name: 'Mülakata başla', exact: true }).click();
    for (let index = 0; index < 3; index++) {
      if (mode === 'voice') await page.clock.runFor(2000); // Finish mocked reading before starting recognition.
      await beginAnswer(page);
      if (mode === 'voice') {
        await page.clock.runFor(150);
        await expect(page.locator('#live-transcript').locator('..')).toContainText('Geçen ay');
        await page.getByRole('button', { name: 'Durdur ve gözden geçir', exact: true }).click();
        await page.clock.runFor(25); // The mocked recognizer delivers its stop callback.
      } else {
        await page.getByLabel('Yanıtın', { exact: true }).fill(answer);
        await expect(page.locator('#answer-count')).toContainText(' / 4.000');
        await page.getByRole('button', { name: 'Yanıtı gözden geçir', exact: true }).click();
      }
      const scored = page.waitForResponse((r) => r.url().endsWith('/api/feedback'));
      await page.getByRole('button', { name: 'Geri bildirim al', exact: true }).click();
      expect((await scored).status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: `Geri bildirim: soru ${index + 1}`, exact: true }),
      ).toBeVisible();
      await expectTurkishOnly(page);
      await expect(page.getByText('(şey 1)', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Bu kararı verirken hangi alternatifi eledin ve neden?', { exact: true }),
      ).toBeVisible();
      if (index === 0 && mode === 'text') {
        await page.getByRole('button', { name: 'Bu öneriyle yeniden dene', exact: true }).click();
        await submitText(
          page,
          answer + ' Sonraki yayında kontrolü otomatik bir testle doğruladım.',
        );
        await page.getByRole('button', { name: 'Takip sorusunu yanıtla', exact: true }).click();
        await beginAnswer(page);
        await page
          .getByLabel('Yanıtın', { exact: true })
          .fill(
            'Yalnızca düğmeyi kapatma seçeneğini eledim çünkü farklı cihazdan gelen tekrar isteği engellemiyordu.',
          );
        await page.getByRole('button', { name: 'Yanıtı gözden geçir', exact: true }).click();
        await page.getByRole('button', { name: 'Geri bildirim al', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Sonraki soru', exact: true })).toBeVisible();
      }
      await page
        .getByRole('button', {
          name: index === 2 ? 'Bitir ve raporu gör' : 'Sonraki soru',
          exact: true,
        })
        .click();
    }
    await expect(page).toHaveURL(/\/report(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Oturum raporu', exact: true })).toBeVisible();
    await expect(page.locator('details[id^="report-answer-"]')).toHaveCount(3);
    await expect(page.getByText(/^En güçlü alanın .*; şimdi .* üzerine çalış\.$/)).toBeVisible();
    await expect(page).toHaveTitle('Oturum raporu · Rehearse');
    await expectTurkishOnly(page);
    await expect(page.locator('details[id^="report-answer-"]').first()).toContainText(/\d deneme/);
    await expect(page.locator('main')).not.toContainText(/\btries?\b|\d\.\d \/ 4/);
    await page.emulateMedia({ media: 'print' });
    await expectTurkishOnly(page);
    await page.emulateMedia({ media: 'screen' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Markdown indir', exact: true }).click();
    const path = await (await downloaded).path();
    expect(path).not.toBeNull();
    const markdown = await readFile(path, 'utf8');
    expect(markdown).toContain('# Rehearse oturum raporu');
    expect(markdown).toContain('## Sorulara göre puanlar');
    expect(markdown).toContain('Geçen ay ekipte');
    expect(markdown).toContain('Soru seti kodu');
    expect(markdown).toMatch(/\d,\d \/ 4/);
    expect(markdown).not.toMatch(/\btries?\b|\d\.\d \/ 4/);
    if (mode === 'voice') {
      const languages = await page.evaluate(() => {
        const s = (
          window as unknown as {
            __speech: { recognitionLanguages: string[]; spokenLanguages: string[] };
          }
        ).__speech;
        return { recognition: s.recognitionLanguages, spoken: s.spokenLanguages };
      });
      expect(languages.recognition).toHaveLength(3);
      expect(languages.recognition.every((l) => l === 'tr-TR')).toBe(true);
      expect(languages.spoken.length).toBeGreaterThanOrEqual(3);
      expect(languages.spoken.every((l) => l === 'tr-TR')).toBe(true);
      expect(await speech(page).overlaps()).toBe(0);
      expect(await speech(page).active()).toBe(false);
    }
    await page.getByRole('link', { name: 'Gelişim', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gelişim', exact: true })).toBeVisible();
    await expect(page).toHaveTitle('Gelişim · Rehearse');
    await expectTurkishOnly(page);
    await expect(page.locator(`a[href*="${session.sessionId}/report"]`).first()).toBeVisible();
  });
}
test('TC-211 Turkish job-post generation and start retain the stored language', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.goto('/setup');
  await page.getByLabel('Türkçe', { exact: true }).check();
  await page
    .getByLabel('İş ilanı bağlantısı veya metni', { exact: true })
    .fill(
      'Kurgusal bir ulaşım ekibinde yazılım mühendisi arıyoruz. Yolcular için erişilebilir başvuru ekranları geliştireceksin. Sunucu isteklerinin hata durumlarını otomatik testlerle doğrulayacaksın. Ekip arkadaşlarınla teknik kararları açık biçimde belgeleyeceksin.',
    );
  await page.getByRole('button', { name: 'İş ilanını oku', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'İş ilanını gözden geçir', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'İlanı analiz et', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'İlanın beklentileri' })).toBeVisible();
  await page.getByRole('button', { name: 'Soruları oluştur', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(8);
  await page.getByRole('checkbox').nth(3).uncheck();
  await page.getByRole('checkbox').nth(4).uncheck();
  const started = page.waitForResponse((r) => r.url().endsWith('/api/sessions/start'));
  await page.getByRole('button', { name: '3 soruyla başla', exact: true }).click();
  const response = await started;
  expect(response.request().postDataJSON()).toMatchObject({ language: 'tr' });
  const session = StartResponseSchema.parse(await response.json());
  expect(session.questions.every((q) => q.id.startsWith('gen-'))).toBe(true);
  expect(
    session.questions.every((q) => q.follow_up_hints.includes('Bu işte senin katkın neydi?')),
  ).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('.room-context')).toHaveText('Yazılım mühendisi');
  await page.getByRole('button', { name: 'Mülakata başla', exact: true }).click();
  await beginAnswer(page);
  await submitText(page, answer);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(
    page.getByRole('heading', { name: 'Geri bildirim: soru 1', exact: true }),
  ).toBeVisible();
});
