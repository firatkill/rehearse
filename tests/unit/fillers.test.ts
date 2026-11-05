import { expect, it } from 'vitest';
import { countFillers } from '@/lib/metrics/fillers';
it.each([
  ['um so I think, like, it was uh fine', { um: 1, like: 1, uh: 1 }],
  ['I would like to add', {}],
  ['so that we can', {}],
  ['and so we shipped it', {}],
  ['you know, it broke', { 'you know': 1 }],
  ['do you know how', {}],
  ['ummm', { um: 1 }],
  ['basically actually', { basically: 1, actually: 1 }],
  ['erm er uhhh umm', { um: 2, uh: 2 }],
  ['You know it failed. You know, it failed.', { 'you know': 1 }],
  ['We shipped so users could try it. So we learned.', {}],
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

it.each([
  'I documented the expected output, so people knew what to check.',
  'We reduced the scope, so we shipped on time.',
  'The check failed, so I rolled it back.',
  'I added a guide, so you could repeat the steps.',
  'I shared the trace, so he could find the bug.',
  'We paired on the fix, so she could deploy it.',
  'The team rehearsed, so they knew the sequence.',
  'I added a retry, so it recovered.',
  'We reduced the bundle, so users loaded less code.',
  'We added documentation, so engineers understood the change.',
  'I added an index, so the service answered faster.',
  'I wrote instructions, so a colleague could take over.',
  'I reduced the scope, so our team could finish.',
  'I fixed the setup, so tests ran reliably.',
  'I explained the diff, so reviewers understood it.',
  'SO PEOPLE could check the expected output.',
])('TC-126 V-03 causal subject context counts no fillers: %s', (text) => {
  expect(countFillers(text)).toEqual({ total: 0, byPhrase: {} });
});

it.each([
  ['So.', { so: 1 }],
  ['So, um, the rollout took longer.', { so: 1, um: 1 }],
  ['So, basically, the rollout took longer.', { so: 1, basically: 1 }],
] satisfies [string, Record<string, number>][])(
  'TC-126 V-03 still counts hesitation: %s',
  (text, byPhrase) => {
    expect(countFillers(text).byPhrase).toEqual(byPhrase);
  },
);
