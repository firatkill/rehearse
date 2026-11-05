import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateFollowUpGolden } from '@/lib/eval/golden-schema';
import { getBank } from '@/lib/questions/bank';
const source = readFileSync('eval/follow-up.jsonl', 'utf8');
test('TC-149 separate follow-up corpus validates exact IDs, bank scope and required data', () => {
  const questions = getBank().questions;
  expect(validateFollowUpGolden(source, questions)).toHaveLength(2);
  const rows: unknown[] = source
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as unknown);
  expect(() => validateFollowUpGolden(JSON.stringify(rows[0]), questions)).toThrow();
  expect(() => validateFollowUpGolden(source.replace('g-29', 'g-28'), questions)).toThrow();
  expect(() => validateFollowUpGolden(source, [])).toThrow();
  expect(() =>
    validateFollowUpGolden(source.replace('"canary": "TANGERINE"', '"canary": null'), questions),
  ).toThrow();
  expect(() =>
    validateFollowUpGolden(source.replace('"followUpPrompt":', '"unknown":'), questions),
  ).toThrow();
});
