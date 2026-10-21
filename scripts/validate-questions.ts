import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coverageMatrix, validateQuestionFiles } from '@/lib/questions/coverage';
import { ROLES, QUESTION_TYPES, SENIORITIES, QUESTION_BANK } from '@/lib/config';

try {
  const folder = 'content/questions';
  const manifest: unknown = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'));
  const files: Record<string, unknown> = Object.fromEntries(
    readdirSync(folder)
      .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
      .map((file) => [file, JSON.parse(readFileSync(join(folder, file), 'utf8')) as unknown]),
  );
  const { questions, errors } = validateQuestionFiles(
    manifest,
    files,
    process.argv.includes('--allow-incomplete'),
  );
  const matrix = coverageMatrix(questions);
  console.log('role/type | junior | mid | senior');
  for (const role of ROLES)
    for (const type of QUESTION_TYPES)
      console.log(
        `${role}/${type} | ${SENIORITIES.map((s) => `${matrix[role][type][s]}${matrix[role][type][s] < QUESTION_BANK.MIN_PER_CELL ? '!' : ''}`).join(' | ')}`,
      );
  console.log(`Active questions: ${questions.filter((q) => q.status === 'active').length}`);
  console.log(
    'Topic counts:',
    Object.fromEntries(
      [...new Set(questions.map((q) => q.topic))]
        .toSorted()
        .map((topic) => [
          topic,
          questions.filter((q) => q.status === 'active' && q.topic === topic).length,
        ]),
    ),
  );
  for (const error of errors) console.error(error);
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Question bank validation failed');
  process.exitCode = 1;
}
