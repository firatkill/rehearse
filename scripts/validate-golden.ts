import { readFileSync } from 'node:fs';
import { getBank } from '@/lib/questions/bank';
import { getTurkishEvalQuestions } from '@/lib/eval/turkish';
import { validateGolden, validateFollowUpGolden } from '@/lib/eval/golden-schema';

try {
  const items = validateGolden(readFileSync('eval/golden.jsonl', 'utf8'), getBank().questions);
  const turkish = getTurkishEvalQuestions();
  validateGolden(readFileSync('eval/golden-tr.jsonl', 'utf8'), turkish.questions);
  validateFollowUpGolden(readFileSync('eval/follow-up-tr.jsonl', 'utf8'), turkish.questions);
  console.log('Turkish golden set valid: 27 items, six triples, nine edge cases; two follow-ups.');
  console.log(`Golden set valid: ${items.length} items, six triples and six edge cases.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Golden set validation failed');
  process.exitCode = 1;
}
