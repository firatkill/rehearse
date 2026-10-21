import { defineConfig, devices } from '@playwright/test';

process.env.E2E_RUN_ID ??= String(Date.now() % 250);

const baseEnv = Object.fromEntries(
  Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === 'string'),
);
const server = (port: number, extra: Record<string, string>) => ({
  command: `pnpm exec next start -p ${port}`,
  url: `http://localhost:${port}/api/health`,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  env: {
    ...baseEnv,
    LLM_MODE: 'mock',
    RATE_LIMIT_BACKEND: 'memory',
    NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
    SESSION_SECRET: 'e2e-session-secret-000000000000000000000000',
    IP_HASH_SECRET: 'e2e-ip-hash-secret-0000000000000000000000000',
    RATE_LIMIT_SESSIONS_PER_IP_DAILY: '3',
    RATE_LIMIT_FEEDBACK_PER_IP_DAILY: '20',
    RATE_LIMIT_GLOBAL_LLM_DAILY: '100000',
    MOCK_LLM_DELAY_MS: '50',
    ...extra,
  },
});

export default defineConfig({
  testDir: 'tests/e2e',
  metadata: { runId: process.env.E2E_RUN_ID },
  timeout: 90_000,
  expect: { timeout: 3000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3200',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'parallel', grepInvert: /@isolated/, fullyParallel: true },
    {
      name: 'isolated',
      grep: /@isolated/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['parallel'],
    },
  ],
  webServer: [
    server(3200, { DEMO_MODE: 'on' }),
    server(3201, { DEMO_MODE: 'readonly' }),
    server(3202, { DEMO_MODE: 'off' }),
    server(3203, { DEMO_MODE: 'on', RATE_LIMIT_GLOBAL_LLM_DAILY: '2' }),
  ],
});
