import { readFileSync } from 'node:fs';
import { getBank } from '@/lib/questions/bank';
import { validateGolden } from '@/lib/eval/golden-schema';

try {
  const items = validateGolden(readFileSync('eval/golden.jsonl', 'utf8'), getBank().questions);
  console.log(`Golden set valid: ${items.length} items, six triples and six edge cases.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Golden set validation failed');
  process.exitCode = 1;
}
