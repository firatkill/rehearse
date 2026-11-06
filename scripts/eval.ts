import { mkdir, readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { parseArgs } from 'node:util';
import { getEnv } from '@/lib/env';
import { getProvider } from '@/lib/llm';
import { getBank } from '@/lib/questions/bank';
import { runEvaluation } from '@/lib/eval/runner';
import { getTurkishEvalQuestions } from '@/lib/eval/turkish';
import { EvalBudgetError } from '@/lib/eval/budget';

async function main() {
  try {
    loadEnvFile('.env.local');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const { values } = parseArgs({
    options: {
      suite: { type: 'string', default: 'golden' },
      language: { type: 'string', default: 'en' },
      mock: { type: 'boolean', default: false },
      ci: { type: 'boolean', default: false },
      'no-gate': { type: 'boolean', default: false },
      repeats: { type: 'string' },
      only: { type: 'string' },
      out: { type: 'string', default: 'eval/results' },
      budget: { type: 'string' },
    },
  });
  const env = getEnv();
  if (values.suite !== 'golden' && values.suite !== 'follow-up')
    throw new Error('Unknown eval suite');
  if (values.language !== 'en' && values.language !== 'tr')
    throw new Error('Unknown eval language');
  const language = values.language;
  const source = await readFile(
    language === 'tr'
      ? values.suite === 'follow-up'
        ? 'eval/follow-up-tr.jsonl'
        : 'eval/golden-tr.jsonl'
      : values.suite === 'follow-up'
        ? 'eval/follow-up.jsonl'
        : 'eval/golden.jsonl',
    'utf8',
  );
  const thresholds: unknown = JSON.parse(await readFile('eval/thresholds.json', 'utf8'));
  const dir = values.out;
  await mkdir(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const files = await readdir(dir);
  const prefix = language === 'tr' ? `turkish-${values.mock ? 'mock-' : ''}` : '';
  const runId = `${prefix}${day}-${files.filter((file) => file.startsWith(`${prefix}${day}-`) && /\d+\.json$/.test(file)).length + 1}`;
  const { results, estimate, exitCode } = await runEvaluation({
    source,
    thresholds,
    bank: language === 'tr' ? getTurkishEvalQuestions() : getBank(),
    provider: getProvider(),
    env,
    options: {
      suite: values.suite,
      language,
      mock: values.mock,
      noGate: values['no-gate'],
      repeats: values.repeats === undefined ? env.EVAL_REPEATS : Number(values.repeats),
      only: values.only?.split(','),
      budget: values.budget === undefined ? env.EVAL_MAX_COST_USD : Number(values.budget),
    },
    runId,
    gitSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  });
  await writeFile(join(dir, `${runId}.json`), JSON.stringify(results, null, 2) + '\n', {
    flag: 'wx',
  });
  const summary = [
    `# Feedback evaluation: ${results.passed ? 'passed' : 'failed'}`,
    '',
    `Run: ${runId}; model: ${results.model}; calls: ${results.items.length}; preflight estimate: $${estimate.toFixed(6)}.`,
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    ...Object.entries(results.metrics).map(
      ([metric, value]) => `| ${metric} | ${value.toFixed(6)} |`,
    ),
    '',
    `Failures: ${results.failures.join(', ') || 'none'}.`,
    ...(values['no-gate']
      ? ['Exit gating disabled; recorded passed reflects actual thresholds.']
      : []),
    '',
  ].join('\n');
  console.log(summary);
  if (values.ci && env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, summary);
  process.exitCode = exitCode;
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof EvalBudgetError
      ? error.message
      : 'Eval configuration error. Check flags, environment variable names, golden set, thresholds and output directory.',
  );
  process.exitCode = 2;
});
