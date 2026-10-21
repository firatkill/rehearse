import { expect, it } from 'vitest';
import { mulberry32, seedToInt, shuffle } from '@/lib/questions/prng';

it('TC-019 UT-02 freezes the first five values of both normative seeds', () => {
  expect(
    [1, 0xdeadbeef].map((seed) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 5 }, rng);
    }),
  ).toMatchInlineSnapshot(`
    [
      [
        0.6270739405881613,
        0.002735721180215478,
        0.5274470399599522,
        0.9810509674716741,
        0.9683778982143849,
      ],
      [
        0.9413696140982211,
        0.26719574979506433,
        0.772033357527107,
        0.35816076025366783,
        0.47554167779162526,
      ],
    ]
  `);
});
it('TC-019 UT-02 produces values in range and a non-mutating permutation', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const value = rng();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
  const source = [1, 2, 3, 4, 5];
  expect(shuffle(source, mulberry32(1)).toSorted()).toEqual(source);
  expect(source).toEqual([1, 2, 3, 4, 5]);
  expect(shuffle([], rng)).toEqual([]);
  expect(seedToInt('deadbeef')).toBe(0xdeadbeef);
  expect(seedToInt('00000001')).toBe(1);
  for (const seed of ['', '1', 'DEADBEEF', '0000000g', '000000000'])
    expect(() => seedToInt(seed)).toThrow('invalid seed');
});
