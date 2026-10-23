import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('TC-119 FR-50 T-38 preserves normative workflow with D-46 approved actions', () => {
  const trd = readFileSync('docs/TRD.md', 'utf8');
  const section = trd.split('### 27.2 `.github/workflows/eval.yml`')[1]!;
  const normative = section
    .split('```yaml\n')[1]!
    .split('\n```')[0]!
    .replaceAll('actions/checkout@v4', 'actions/checkout@v7')
    .replaceAll('pnpm/action-setup@v4', 'pnpm/action-setup@v6')
    .replaceAll('actions/setup-node@v4', 'actions/setup-node@v7')
    .replaceAll('actions/upload-artifact@v4', 'actions/upload-artifact@v7');
  expect(readFileSync('.github/workflows/eval.yml', 'utf8').trim()).toBe(normative.trim());
});
