import { defineConfig, devices } from '@playwright/test';
const basePort = Number(process.env.E2E_BASE_PORT ?? 3200);
export default defineConfig({
  testDir: 'tests/e2e-demo',
  timeout: 90_000,
  expect: { timeout: 3000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  metadata: { basePort, runId: String(Date.now() % 250) },
  use: {
    baseURL: `http://localhost:${basePort}`,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'parallel', grepInvert: /@isolated/ },
    { name: 'isolated', grep: /@isolated/, workers: 1, dependencies: ['parallel'] },
  ],
  webServer: [0, 1].map((offset) => ({
    command: `pnpm exec next start -p ${basePort + offset}`,
    url: `http://localhost:${basePort + offset}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      APP_EDITION: 'demo',
      NODE_ENV: 'test',
      DEMO_MODE: offset === 1 ? 'readonly' : 'on',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${basePort + offset}`,
    },
  })),
});
