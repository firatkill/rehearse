import { readFileSync } from 'node:fs';
import { validateSample } from '@/lib/storage/sample-schema';
try {
  const value: unknown = JSON.parse(readFileSync('content/sample/session.json', 'utf8'));
  const sample = validateSample(value, process.argv.includes('--allow-mock'));
  console.log(`Sample valid: ${sample.answers.length} scored answers.`);
} catch {
  console.error(
    'Sample validation failed. Live model output is required unless --allow-mock is explicitly set.',
  );
  process.exitCode = 1;
}
