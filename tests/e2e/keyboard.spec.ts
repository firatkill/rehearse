import { expect, test, type Page, type Locator } from '@playwright/test';
import { scenarios, uniqueIp } from './helpers';
import { installSpeechMock } from './speech-mock';
async function tabTo(page: Page, target: Locator) {
  for (let n = 0; n < 60; n++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
test('TC-113 E2E-24 keyboard-only text session, phase focus and dialog trap', async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': uniqueIp(info) });
  await page.addInitScript(installSpeechMock, scenarios.noRecognition);
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-21T12:01:00Z'));
  await page.goto('/setup');
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
  await tabTo(page, page.getByLabel('Text: type your answers'));
  await page.keyboard.press('Space');
  await tabTo(page, page.getByLabel('3 questions'));
  await page.keyboard.press('Space');
  await tabTo(page, page.getByRole('button', { name: 'Start session', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Start the interview' })).toBeFocused();
  await page.keyboard.press('Enter');
  for (let index = 0; index < 3; index++) {
    await expect(page.getByRole('button', { name: 'Start answering now' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Your answer')).toBeFocused();
    await page.keyboard.type(`I delivered task ${index + 1} and reduced errors from ten to two.`);
    if (index === 0) {
      await tabTo(page, page.getByRole('button', { name: 'Skip question', exact: true }));
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Skip this question?' });
      await expect(dialog.getByRole('button', { name: 'Keep answering' })).toBeFocused();
      for (let n = 0; n < 6; n++) {
        await page.keyboard.press(n % 2 === 0 ? 'Tab' : 'Shift+Tab');
        expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
          true,
        );
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
    await tabTo(page, page.getByRole('button', { name: 'Review answer' }));
    await page.keyboard.press('Enter');
    const answer = page.getByLabel('Your answer');
    await expect(answer).toBeFocused();
    expect(
      await answer.evaluate(
        (element: HTMLTextAreaElement) => element.selectionStart === element.value.length,
      ),
    ).toBe(true);
    await tabTo(page, page.getByRole('button', { name: 'Get feedback', exact: true }));
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: `Feedback on question ${index + 1}` }),
    ).toBeFocused();
    await tabTo(
      page,
      page.getByRole('button', { name: index === 2 ? 'Finish and see report' : 'Next question' }),
    );
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
});
