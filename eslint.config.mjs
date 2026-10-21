import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

const serverModules = [
  '@/lib/env',
  '@/lib/logger',
  '@/lib/request',
  '@/lib/hash',
  '@/lib/llm/**',
  '@/lib/prompts/**',
  '@/lib/ratelimit/**',
  '@/lib/session/**',
  '@/lib/questions/bank',
  '@/lib/questions/select',
  '@/lib/feedback/generate',
  '@/lib/feedback/normalize',
  '@/lib/feedback/evidence',
  '@/lib/summary/generate',
  '@/lib/cost/**',
  '@/lib/eval/**',
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'react/no-danger': 'error',
      'no-console': 'error',
    },
  },
  { files: ['tests/**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  { files: ['scripts/**/*.ts'], rules: { 'no-console': 'off' } },
  {
    files: ['components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: serverModules }] },
  },
  {
    files: ['lib/{speech,metrics,room,storage,report}/**/*.ts', 'lib/feedback/rubric.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['next', 'next/*'] }] },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
