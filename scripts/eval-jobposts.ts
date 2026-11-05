import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';
import { evaluateJobPosts } from '@/lib/jobpost/evaluation';
import { createMockProvider } from '@/lib/llm/mock';
import { getBank } from '@/lib/questions/bank';
async function main() {
  try {
    loadEnvFile('.env.local');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const paths = (await readdir('eval/golden-jobposts'))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const fixtures: unknown[] = await Promise.all(
    paths.map(
      async (name) =>
        JSON.parse(await readFile(join('eval/golden-jobposts', name), 'utf8')) as unknown,
    ),
  );
  // This entry point deliberately constructs only the mock provider, regardless of local secrets.
  const result = await evaluateJobPosts(
    fixtures,
    createMockProvider(),
    getBank().questions.map((item) => item.prompt),
  );
  await mkdir('.eval-tmp', { recursive: true });
  await writeFile(
    '.eval-tmp/jobposts-mock.json',
    JSON.stringify({ ...result, costUsd: 0 }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      cases: result.results.length,
      grounding: result.grounding,
      duplicates: result.duplicates,
      injectionResistance: result.injectionResistance,
      passed: result.passed,
      costUsd: 0,
    }),
  );
  if (!result.passed) process.exitCode = 1;
}
main().catch(() => {
  console.error('Job-post mock evaluation failed');
  process.exitCode = 1;
});
