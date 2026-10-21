import { expect, it } from 'vitest';
import { formatDurationWords } from '@/lib/time';
it.each([
  [60, '1 minute'],
  [90, '90 seconds'],
  [120, '2 minutes'],
  [150, '2 minutes 30 seconds'],
] as const)('TC-039 TRD 11.2 duration %s uses the specified wording', (seconds, words) => {
  expect(formatDurationWords(seconds)).toBe(words);
});
