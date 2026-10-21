import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/setup/empty.ts', import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['lib/**'],
      exclude: ['lib/llm/openai.ts', 'lib/ratelimit/upstash.ts', 'lib/logger.ts'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        'lib/{questions/{select,prng},session/token,speech/{recorder-machine,transcript},room/machine}.ts':
          { lines: 90 },
        'lib/{metrics,ratelimit,storage,feedback}/**': { lines: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/setup/unit.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/component/**/*.test.tsx'],
          setupFiles: ['tests/setup/unit.ts', 'tests/setup/component.ts'],
        },
      },
    ],
  },
});
