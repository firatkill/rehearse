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
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
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
  // TRD §25.3 is normative: retain its browser feature guards and async mock signatures.
  {
    files: ['tests/e2e/speech-mock.ts'],
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/require-await': 'off',
    },
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
