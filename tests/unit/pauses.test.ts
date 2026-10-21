import { expect, it } from 'vitest';
import { pauses } from '@/lib/metrics/pauses';
it('TC-062 UT-07 FR-24 fewer than two events cannot measure pauses', () => {
  expect(pauses([])).toEqual({ longestPauseMs: null, longPauses: null });
  expect(pauses([500])).toEqual({ longestPauseMs: null, longPauses: null });
});
it('TC-062 UT-07 FR-24 sorts without mutation, includes 3000ms boundary, excludes trailing time', () => {
  const offsets = [10000, 1000, 4000, 5000, 5000];
  const original = [...offsets];
  expect(pauses(offsets)).toEqual({ longestPauseMs: 5000, longPauses: 2 });
  expect(offsets).toEqual(original);
  expect(pauses([0, 2999])).toEqual({ longestPauseMs: 2999, longPauses: 0 });
  expect(pauses([1000, 1000])).toEqual({ longestPauseMs: 0, longPauses: 0 });
});
