import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function auditV6(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  const fields = await page
    .locator('main textarea, main input:not([type=checkbox]):not([type=radio]):not([type=hidden])')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().height > 0)
        .map((node) => ({
          font: parseFloat(getComputedStyle(node).fontSize),
          height: node.getBoundingClientRect().height,
          width: node.getBoundingClientRect().width,
        })),
    );
  expect(fields.every((field) => field.font >= 16 && field.height >= 44 && field.width >= 44)).toBe(
    true,
  );
  const buttons = await page.locator('main button').evaluateAll((nodes) =>
    nodes
      .filter((node) => node.getBoundingClientRect().height > 0)
      .map((node) => ({
        name: node.textContent,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      })),
  );
  expect(buttons.filter((button) => button.width < 44 || button.height < 44)).toEqual([]);
}

export async function reducedMotionV6(page: Page) {
  const moving = await page.locator('body *').evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      const styles = getComputedStyle(node);
      return [styles.animationDuration, styles.transitionDuration]
        .flatMap((value) => value.split(',').map(Number.parseFloat))
        .some((seconds) => seconds > 0.00001)
        ? [node.tagName]
        : [];
    }),
  );
  expect(moving).toEqual([]);
}
