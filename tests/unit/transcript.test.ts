import { expect, it } from 'vitest';
import { applyResults, commitRun, fullText, capText } from '@/lib/speech/transcript';
const empty = { committed: '', runFinal: '', runInterim: '' };
it('TC-049 UT-17 rebuilds resent lists and keeps the last interim across runs', () => {
  let state = applyResults(empty, [
    { transcript: ' I led ', isFinal: true },
    { transcript: ' the team ', isFinal: false },
  ]);
  expect(fullText(state)).toBe('I led the team');
  state = applyResults(state, [
    { transcript: ' I led ', isFinal: true },
    { transcript: ' the team to delivery ', isFinal: false },
  ]);
  expect(fullText(state)).toBe('I led the team to delivery');
  state = commitRun(state);
  expect(state).toEqual({ committed: 'I led the team to delivery', runFinal: '', runInterim: '' });
  state = applyResults(state, [{ transcript: ' with tests ', isFinal: true }]);
  expect(fullText(commitRun(state))).toBe('I led the team to delivery with tests');
  expect(fullText(empty)).toBe('');
});
it('TC-049 UT-17 cap prefers only a word boundary within the last ten percent', () => {
  expect(capText('short', 20)).toBe('short');
  expect(capText('1234567890123456789 next', 20)).toBe('1234567890123456789');
  expect(capText('short ' + 'a'.repeat(30), 20)).toBe(('short ' + 'a'.repeat(30)).slice(0, 20));
  expect(capText('a'.repeat(25), 20)).toBe('a'.repeat(20));
});
