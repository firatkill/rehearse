import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
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

// TC-131 / D-93: execute only the guard, never the paid command.
it.each([false, true])('TC-131 optional eval configuration ready=%s', (configured) => {
  const workflow = readFileSync('.github/workflows/eval.yml', 'utf8');
  const block = workflow.split('        run: |\n')[1]!.split('      - uses:')[0]!;
  const script = block
    .split('\n')
    .map((line) => line.replace(/^          /, ''))
    .join('\n');
  const dir = mkdtempSync(join(tmpdir(), 'rehearse-eval-config-'));
  try {
    execFileSync('/bin/sh', ['-eu', '-c', script], {
      env: {
        NODE_ENV: 'test',
        OPENAI_API_KEY: configured ? 'dummy' : '',
        EVAL_ONLY: configured ? 'explicit-new-case' : '',
        CHAT_MODEL: configured ? 'dummy' : '',
        PRICE_INPUT_PER_MTOK: configured ? '1' : '',
        PRICE_OUTPUT_PER_MTOK: configured ? '1' : '',
        GITHUB_OUTPUT: join(dir, 'output'),
        GITHUB_STEP_SUMMARY: join(dir, 'summary'),
      },
    });
    expect(readFileSync(join(dir, 'output'), 'utf8').trim()).toBe(`ready=${configured}`);
    expect(workflow).not.toContain('exit 1');
    const steps = workflow.split('    steps:')[1]!.split('      - ').slice(2);
    expect(steps.every((step) => step.includes("steps.config.outputs.ready == 'true'"))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('TC-177 paid CI requires explicit owner dispatch and selected cases', () => {
  const workflow = readFileSync('.github/workflows/eval.yml', 'utf8');
  expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'\n");
  expect(workflow).toContain('--only \"$EVAL_ONLY\"');
});
