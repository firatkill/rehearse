import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { test as base, expect } from '@playwright/test';
import { serverUrl } from '../e2e/helpers';

const require = createRequire(`${process.cwd()}/package.json`);

export const test = base.extend<{ capOrigin: string }>({
  capOrigin: [
    async ({ playwright }, runTest, info) => {
      const origin = serverUrl(info, 3);
      const child = spawn(
        process.execPath,
        [require.resolve('next/dist/bin/next'), 'start', '-p', new URL(origin).port],
        {
          env: {
            ...process.env,
            APP_EDITION: 'full',
            NODE_ENV: 'test',
            LLM_MODE: 'mock',
            RATE_LIMIT_BACKEND: 'memory',
            DEMO_MODE: 'on',
            NEXT_PUBLIC_SITE_URL: origin,
            SESSION_SECRET: 'e2e-session-secret-000000000000000000000000',
            IP_HASH_SECRET: 'e2e-ip-hash-secret-0000000000000000000000000',
            RATE_LIMIT_SESSIONS_PER_IP_DAILY: '3',
            RATE_LIMIT_FEEDBACK_PER_IP_DAILY: '20',
            RATE_LIMIT_GLOBAL_LLM_DAILY: '2',
            MOCK_LLM_DELAY_MS: '50',
          },
          stdio: 'ignore',
        },
      );
      let failure: Error | undefined;
      child.on('error', (error) => {
        failure = error;
      });
      const exited = new Promise<void>((resolve) => {
        child.once('close', () => {
          resolve();
        });
      });
      const request = await playwright.request.newContext();
      try {
        // D-71 / TRD §25.4 permits 120 s for server startup only.
        await expect
          .poll(
            async () => {
              if (failure) throw failure;
              if (child.exitCode !== null) throw new Error('Cap server exited before startup');
              try {
                return (await request.get(`${origin}/api/health`)).status();
              } catch {
                return 0;
              }
            },
            { timeout: 120_000 },
          )
          .toBe(200);
        await runTest(origin);
      } finally {
        await request.dispose();
        child.kill('SIGTERM');
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
        }, 5000);
        await exited;
        clearTimeout(timer);
      }
    },
    { timeout: 130_000 },
  ],
});
