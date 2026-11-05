import { chromium, type Page } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { PERFORMANCE } from '../lib/config';

async function main() {
  const origin = new URL(process.argv[2] ?? 'http://localhost:3325');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:')
    throw new Error('Performance measurement accepts local HTTP origins only');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin.origin || /\/api\/(feedback|summary|job-posts)/.test(url.pathname))
        await route.abort();
      else await route.continue();
    });
    async function coldPage() {
      const page = await context.newPage();
      page.setDefaultTimeout(3000);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      return page;
    }
    async function measure(page: Page, route: string, budget: number) {
      const paths = await page.evaluate(() => [
        ...new Set(
          performance
            .getEntriesByType('resource')
            .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === 'script')
            .map((entry) => new URL(entry.name).pathname),
        ),
      ]);
      const chunks = await Promise.all(
        paths.map(async (path) => {
          const response = await fetch(new URL(path, origin));
          if (!response.ok) throw new Error(`Asset status ${response.status}`);
          const body = Buffer.from(await response.arrayBuffer());
          return { path, bytes: body.length, gzipBytes: gzipSync(body).length };
        }),
      );
      const gzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
      return { route, gzipBytes, budget, passed: gzipBytes <= budget, chunks };
    }
    const landing = await coldPage();
    await landing.goto(origin.origin, { waitUntil: 'load' });
    await landing.locator('main h1').waitFor();
    const home = await measure(landing, '/', PERFORMANCE.LANDING_JS_GZIP_BYTES);
    await landing.close();
    const setup = await context.newPage();
    setup.setDefaultTimeout(3000);
    await setup.goto(new URL('/setup', origin).href);
    await setup.getByLabel('Text: type your answers').check();
    await setup.getByRole('button', { name: 'Start session', exact: true }).click();
    await setup.getByRole('button', { name: 'Start the interview', exact: true }).waitFor();
    const roomUrl = setup.url();
    await setup.close();
    const room = await coldPage();
    await room.goto(roomUrl, { waitUntil: 'load' });
    await room.getByRole('button', { name: 'Start the interview', exact: true }).waitFor();
    const interview = await measure(room, '/session/[id]', PERFORMANCE.ROOM_JS_GZIP_BYTES);
    const result = {
      measuredAt: new Date().toISOString(),
      browser: browser.version(),
      method:
        'Cold modern-browser script resources through load/room readiness; Node default gzip; includes asynchronously required scripts, excludes unrequested nomodule fallbacks.',
      results: [home, interview],
    };
    await mkdir('.eval-tmp', { recursive: true });
    await writeFile('.eval-tmp/performance-bundle.json', JSON.stringify(result, null, 2) + '\n');
    console.log(
      JSON.stringify(
        result.results.map(({ route, gzipBytes, budget, passed }) => ({
          route,
          gzipBytes,
          budget,
          passed,
        })),
        null,
        2,
      ),
    );
    if (!result.results.every((item) => item.passed)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Measurement failed');
  process.exitCode = 1;
});
