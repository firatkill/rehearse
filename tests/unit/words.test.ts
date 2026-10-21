import { expect, it } from 'vitest';
import { tokenize, countWords } from '@/lib/metrics/words';
it.each([
  ['I’m done.', 2],
  ['state-of-the-art', 1],
  ['3.5 seconds', 3],
  ['', 0],
  [' \n\t', 0],
  ['😀 ♥ + =', 0],
  ['ＡＢＣ １２３', 2],
] as const)('TC-037 UT-04 counts %s as %i words', (text, count) => {
  expect(countWords(text)).toBe(count);
});
it('TC-037 UT-04 token offsets refer to NFKC text with normalised apostrophes', () => {
  expect(tokenize('I’m ＤＯＮＥ.')).toEqual([
    { w: "i'm", start: 0, end: 3 },
    { w: 'done', start: 4, end: 8 },
  ]);
});
