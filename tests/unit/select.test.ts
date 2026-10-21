import { expect, it } from 'vitest';
import { getBank } from '@/lib/questions/bank';
import { selectQuestions, newSeed, type SelectionInput } from '@/lib/questions/select';
import { QuestionSchema } from '@/lib/questions/schema';
import { ROLES, SENIORITIES, QUESTION_TYPES, QUESTION_BANK } from '@/lib/config';
import fixture from '@/tests/fixtures/bank-small.json';

const bank = getBank().questions;
const small = QuestionSchema.array().parse(fixture);
const base: SelectionInput = {
  role: 'backend',
  seniority: 'mid',
  types: QUESTION_TYPES,
  length: 5,
  seed: '00000001',
};
it('TC-020 UT-01 freezes five fixture selections and is insensitive to bank order', () => {
  const inputs: SelectionInput[] = [
    base,
    { ...base, seed: 'deadbeef' },
    { ...base, role: 'frontend', length: 3 },
    { ...base, types: ['behavioral'], length: 3 },
    { ...base, types: ['technical-concepts', 'system-design-lite'], seed: '00000000' },
  ];
  const selected = inputs.map((input) => selectQuestions(small, input).map((q) => q.id));
  expect(selected).toMatchInlineSnapshot(`
    [
      [
        "beh-004",
        "tec-003",
        "tec-002",
        "sdl-001",
        "sdl-004",
      ],
      [
        "beh-004",
        "beh-001",
        "tec-004",
        "sdl-004",
        "sdl-003",
      ],
      [
        "beh-004",
        "tec-003",
        "sdl-001",
      ],
      [
        "beh-004",
        "beh-003",
        "beh-002",
      ],
      [
        "tec-002",
        "tec-003",
        "tec-004",
        "sdl-001",
        "sdl-003",
      ],
    ]
  `);
  expect(
    inputs.map((input) => selectQuestions([...small].reverse(), input).map((q) => q.id)),
  ).toEqual(selected);
});
it.each(
  ROLES.flatMap((role) =>
    SENIORITIES.flatMap((seniority) =>
      QUESTION_TYPES.map((cellType) => ({ role, seniority, cellType })),
    ),
  ),
)('TC-020 UT-01 exhaustive cell $role/$seniority/$cellType', ({ role, seniority, cellType }) => {
  expect(
    bank.some(
      (q) => q.type === cellType && q.roles.includes(role) && q.seniority.includes(seniority),
    ),
  ).toBe(true);
  for (const length of [3, 5] as const)
    for (let mask = 1; mask < 8; mask++)
      for (let n = 0; n < 20; n++) {
        const types = QUESTION_TYPES.filter((_, i) => mask & (1 << i));
        const input = {
          role,
          seniority,
          types,
          length,
          seed: n.toString(16).padStart(8, '0'),
        };
        const selected = selectQuestions(bank, input);
        expect(selected).toHaveLength(length);
        expect(new Set(selected.map((q) => q.id)).size).toBe(length);
        expect(new Set(selected.map((q) => q.topic)).size).toBe(length);
        expect(
          selected.every(
            (q) =>
              q.roles.includes(role) && q.seniority.includes(seniority) && types.includes(q.type),
          ),
        ).toBe(true);
        const counts = types.map((type) => selected.filter((q) => q.type === type).length);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        const ranks = selected.map((q) => QUESTION_BANK.TYPE_ORDER.indexOf(q.type));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        expect(selectQuestions(bank, input).map((q) => q.id)).toEqual(selected.map((q) => q.id));
      }
});
it('TC-020 UT-01 changes selection for at least 90 of 100 seed pairs', () => {
  let changed = 0;
  for (let i = 0; i < 100; i++) {
    const a = selectQuestions(bank, { ...base, seed: (i * 2).toString(16).padStart(8, '0') }).map(
      (q) => q.id,
    );
    const b = selectQuestions(bank, {
      ...base,
      seed: (i * 2 + 1).toString(16).padStart(8, '0'),
    }).map((q) => q.id);
    if (JSON.stringify(a) !== JSON.stringify(b)) changed++;
  }
  expect(changed).toBeGreaterThanOrEqual(90);
  expect(newSeed()).toMatch(/^[0-9a-f]{8}$/);
});
it('TC-021 UT-01 uses fallback tiers and repeated topics only when needed, then rejects exhaustion', () => {
  const questions = small
    .filter((q) => q.type === 'behavioral')
    .slice(0, 3)
    .map((q, i) => ({
      ...q,
      topic: 'shared',
      roles: i === 2 ? ['frontend' as const] : q.roles,
      seniority: i === 1 ? ['senior' as const] : q.seniority,
    }));
  expect(selectQuestions(questions, { ...base, types: ['behavioral'], length: 3 })).toHaveLength(3);
  expect(() =>
    selectQuestions(questions.slice(0, 2), { ...base, types: ['behavioral'], length: 3 }),
  ).toThrow('question bank exhausted');
  expect(() =>
    selectQuestions(
      questions.map((q) => ({ ...q, status: 'retired' })),
      base,
    ),
  ).toThrow('question bank exhausted');
});
