import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Chip } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/segmented';
import { ScoreStrip } from '@/components/ui/score-strip';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { DemoBanner } from '@/components/ui/demo-banner';
import { ProgressSegments } from '@/components/ui/progress-segments';
import { MarkedTranscript } from '@/components/ui/marked-transcript';
import { HeatCell } from '@/components/ui/heat-cell';

// Vitest DOM gallery only; its rendered markup is also scanned in Chromium for real contrast.
// No application route, provider or speech API is involved.
// globals.css is loaded without Tailwind compilation: shared components must keep
// contrast- and size-critical styles in globals.css classes, not Tailwind utilities.
it('TC-136 V-10 gallery passes axe in both themes with real rendered contrast and target sizes', async () => {
  const { container } = render(
    <>
      <DemoBanner edition="demo" />
      <main>
        <h1>Component gallery</h1>
        <Card>
          <Eyebrow>Practice</Eyebrow>
          <h2>Controls</h2>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="text">Text action</Button>
          <Button disabled>Unavailable</Button>
          <Chip selected>Selected</Chip>
          <Chip selected={false}>Unselected</Chip>
          <Segmented
            label="Answer by"
            value="voice"
            onChange={() => {}}
            options={[
              { value: 'voice', label: 'Voice' },
              { value: 'text', label: 'Typing' },
            ]}
          />
        </Card>
        <ScoreStrip
          scores={{
            structure: 1,
            specificity: 2,
            ownership: 3,
            impact: 4,
            relevance: null,
            clarity: 3,
          }}
        />
        <DeltaBadge value={1} />
        <DeltaBadge value={-1} />
        <DeltaBadge value={0} />
        <ProgressSegments current={1} total={3} />
        <MarkedTranscript
          text="I shipped it, um."
          marks={[
            { start: 0, end: 12, kind: 'strong' },
            { start: 14, end: 16, kind: 'filler' },
          ]}
        />
        {[1, 2, 3, 4, null].map((score, i) => (
          <HeatCell key={i} score={score} />
        ))}
        <div className="stage">
          <Button variant="on-dark">On dark</Button>
          <p>Room stage</p>
        </div>
      </main>
    </>,
  );
  vi.useRealTimers();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/*', (route) => route.abort());
    await page.setContent(
      `<!doctype html><html lang="en"><head><title>Component gallery</title></head><body>${container.innerHTML}</body></html>`,
    );
    await page.addStyleTag({
      content: readFileSync('app/globals.css', 'utf8').replace(/@import[^;]+;/g, ''),
    });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
      ).toEqual([]);
      expect(
        await page
          .getByRole('button', { name: 'Primary', exact: true })
          .evaluate((el) => el.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(48);
      expect(
        await page
          .getByRole('button', { name: 'Secondary', exact: true })
          .evaluate((el) => el.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      expect(
        await page.locator('.stage').evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(13, 20, 18)');
    }
  } finally {
    await browser.close();
  }
});
