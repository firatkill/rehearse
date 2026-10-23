import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBank } from '@/lib/questions/bank';
import { GoldenItemSchema, validateGolden, type GoldenItem } from '@/lib/eval/golden-schema';
import { countWords } from '@/lib/metrics/words';

const source = readFileSync('eval/golden.jsonl', 'utf8');
const bank = getBank().questions;
const lines = () =>
  source
    .trim()
    .split('\n')
    .map((line) => GoldenItemSchema.parse(JSON.parse(line) as unknown));
const serialize = (items: GoldenItem[]) => items.map((item) => JSON.stringify(item)).join('\n');
function change(index: number, patch: Partial<GoldenItem>) {
  return serialize(lines().map((item, i) => (i === index ? { ...item, ...patch } : item)));
}

describe('TC-102 / TC-103 — FR-48, UT-36 golden corpus', () => {
  it('validates the real set and preserves every normative example exactly', () => {
    const items = validateGolden(source, bank);
    expect(items).toHaveLength(24);
    const section = readFileSync('docs/TRD.md', 'utf8')
      .split('### 18.3 Example golden items')[1]
      ?.split('### 18.4')[0];
    const block = section?.match(/```json\n([\s\S]*?)\n```/)?.[1];
    expect(block).toBeDefined();
    const examples = (block ?? '')
      .split(/\n\s*\n/)
      .map((text) => GoldenItemSchema.parse(JSON.parse(text) as unknown));
    expect(examples).toHaveLength(6);
    for (const item of examples)
      expect(items.find((candidate) => candidate.id === item.id)).toEqual(item);
    for (const item of items.filter(
      (item) => !examples.some((example) => example.id === item.id),
    )) {
      expect(countWords(item.transcript)).toBeGreaterThanOrEqual(20);
      expect(countWords(item.transcript)).toBeLessThanOrEqual(450);
      for (const [lo, hi] of Object.values(item.expected)) expect(hi - lo).toBeLessThanOrEqual(1);
    }
    const shortTechnical = items.find((item) => item.id === 'g-22');
    expect(countWords(shortTechnical!.transcript)).toBeLessThanOrEqual(25);
  });

  it.each([
    ['missing line', () => serialize(lines().slice(1))],
    ['extra line', () => serialize([...lines(), lines()[0]!])],
    ['duplicate id', () => change(1, { id: 'g-01' })],
    ['out-of-range id', () => change(0, { id: 'g-25' })],
    ['unknown question', () => change(0, { question_id: 'beh-999' })],
    ['ineligible role', () => change(6, { role: 'frontend' })],
    ['ineligible seniority', () => change(6, { seniority: 'junior' })],
    ['wrong category count', () => change(0, { category: 'weak' })],
    ['missing triple', () => change(0, { triple: null })],
    ['broken triple', () => change(0, { triple: 't2' })],
    ['unknown triple', () => change(0, { triple: 't7' })],
    ['different triple question', () => change(0, { question_id: 'beh-001' })],
    ['edge item in triple', () => change(18, { triple: 't1' })],
    ['missing canary', () => change(22, { canary: null })],
    ['long very-short answer', () => change(20, { transcript: 'word '.repeat(40) })],
    [
      'off-topic relevance',
      () => change(18, { expected: { ...lines()[18]!.expected, relevance: [1, 2] } }),
    ],
    ['only one voice item', () => change(2, { mode: 'text' })],
  ])('rejects %s', (_name, invalid) => {
    expect(() => validateGolden(invalid(), bank)).toThrow();
  });

  it('rejects retired questions and missing type coverage', () => {
    expect(() =>
      validateGolden(
        source,
        bank.map((q) => (q.id === 'beh-002' ? { ...q, status: 'retired' } : q)),
      ),
    ).toThrow(/active/);
    const items = lines().map((item) =>
      item.triple === 't5' ? { ...item, question_id: 'beh-001' } : item,
    );
    expect(() => validateGolden(serialize(items), bank)).toThrow(/system design/);
  });

  it('rejects malformed JSON, reversed ranges and unknown schema keys', () => {
    expect(() => validateGolden(source.replace(/\{/, '!'), bank)).toThrow(/line 1/);
    const item = lines()[0]!;
    expect(GoldenItemSchema.safeParse({ ...item, extra: true }).success).toBe(false);
    expect(
      GoldenItemSchema.safeParse({ ...item, expected: { ...item.expected, structure: [4, 1] } })
        .success,
    ).toBe(false);
    expect(
      GoldenItemSchema.safeParse({
        ...item,
        expected_flags: { ...item.expected_flags, extra: false },
      }).success,
    ).toBe(false);
  });
});
