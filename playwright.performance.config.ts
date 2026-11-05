import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testDir: 'tests/performance',
  projects: [{ name: 'performance' }],
  workers: 1,
});
