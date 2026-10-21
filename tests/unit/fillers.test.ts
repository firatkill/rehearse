import { expect, it } from 'vitest';
import { countFillers } from '@/lib/metrics/fillers';
it.each([
  ['um so I think, like, it was uh fine', { um: 1, so: 1, like: 1, uh: 1 }],
  ['I would like to add', {}],
  ['so that we can', {}],
  ['and so we shipped it', { so: 1 }],
  ['you know, it broke', { 'you know': 1 }],
  ['do you know how', {}],
  ['ummm', { um: 1 }],
  ['basically actually', { basically: 1, actually: 1 }],
  ['erm er uhhh umm', { um: 2, uh: 2 }],
  ['You know it failed. You know, it failed.', { 'you know': 1 }],
  ['We shipped so users could try it. So we learned.', { so: 1 }],
  ['So far, so much, so many, so long, so called', {}],
  ['ＵＭ like like, you know, actually', { um: 1, like: 2, 'you know': 1, actually: 1 }],
] satisfies [string, Record<string, number>][])(
  'TC-037 UT-05 counts fillers in %s',
  (text, expected) => {
    const counts = countFillers(text);
    expect(counts.byPhrase).toEqual(expected);
    expect(counts.total).toBe(Object.values(expected).reduce((a, b) => a + b, 0));
  },
);
it('TC-037 UT-05 respects enabled phrases and ignores empty input', () => {
  expect(countFillers('um like uh you know, so actually', ['uh', 'you know'])).toEqual({
    total: 2,
    byPhrase: { uh: 1, 'you know': 1 },
  });
  expect(countFillers('um like', [])).toEqual({ total: 0, byPhrase: {} });
  expect(countFillers('')).toEqual({ total: 0, byPhrase: {} });
});
