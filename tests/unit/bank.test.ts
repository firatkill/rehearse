import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBank } from '@/lib/questions/bank';
import { checkBankRules, coverageMatrix, validateQuestionFiles } from '@/lib/questions/coverage';
import { ManifestSchema, QuestionSchema, toSnapshot } from '@/lib/questions/schema';
import { ROLES, QUESTION_TYPES, SENIORITIES } from '@/lib/config';

const bank = getBank();
const first = bank.questions[0]!;
describe('TC-016 TC-017 — FR-01, FR-03; UT-03', () => {
  it('preserves the 15 normative question examples verbatim', () => {
    const spec = readFileSync('docs/TRD.md', 'utf8').split('### 6.4')[1]!.split('### 6.5')[0]!;
    const examples = [...spec.matchAll(/```json\n([\s\S]*?)\n```/g)].flatMap((match) =>
      QuestionSchema.array().parse(JSON.parse(match[1]!)),
    );
    expect(examples).toHaveLength(15);
    for (const example of examples) expect(bank.byId.get(example.id)).toEqual(example);
  });
  it('parses the real bank and matches the manifest to the folder', () => {
    const manifest = ManifestSchema.parse(
      JSON.parse(readFileSync('content/questions/manifest.json', 'utf8')),
    );
    expect(manifest.files.toSorted()).toEqual(
      readdirSync('content/questions')
        .filter((f) => f !== 'manifest.json')
        .toSorted(),
    );
    expect(bank.bankVersion).toBe('1.0.0');
    expect(getBank()).toBe(bank);
    expect(bank.byId.get(first.id)).toEqual(first);
    expect(checkBankRules(bank.questions).filter((e) => !e.startsWith('coverage:'))).toEqual([]);
    expect(Object.keys(toSnapshot(first)).toSorted()).toEqual(
      [
        'id',
        'type',
        'topic',
        'prompt',
        'follow_up_hints',
        'what_good_looks_like',
        'time_limit_s',
      ].toSorted(),
    );
  });
  it.each([
    { roles: ['backend', 'backend'] },
    { seniority: ['mid', 'mid'] },
    { id: 'tec-999' },
    { prompt: Array.from({ length: 46 }, () => 'word').join(' ') },
    { unexpected: true },
    { time_limit_s: 59 },
    { follow_up_hints: ['too short'] },
  ])('rejects schema violation %j', (patch) => {
    expect(QuestionSchema.safeParse({ ...first, ...patch }).success).toBe(false);
  });
  it('rejects duplicate ids and excessive active topic counts, ignoring retired coverage', () => {
    const duplicates = checkBankRules([first, first]);
    expect(duplicates.some((e) => e.includes('duplicate id'))).toBe(true);
    const questions = Array.from({ length: 5 }, (_, i) => ({
      ...first,
      id: `beh-1${String(i).padStart(2, '0')}`,
    }));
    expect(checkBankRules(questions).some((e) => e.includes('topic:'))).toBe(true);
    expect(
      checkBankRules(questions.map((q) => ({ ...q, status: 'retired' }))).some((e) =>
        e.includes('topic:'),
      ),
    ).toBe(false);
    const matrix = coverageMatrix([{ ...first, status: 'retired' }]);
    for (const role of ROLES)
      for (const type of QUESTION_TYPES)
        for (const seniority of SENIORITIES) expect(matrix[role][type][seniority]).toBe(0);
  });
  it('rejects unsorted files, missing files, wrong file types and markup', () => {
    const manifest = { bankVersion: '1.0.0', files: ['behavioral.json'] };
    expect(
      validateQuestionFiles(
        manifest,
        { 'behavioral.json': [{ ...first, id: 'beh-999' }, first] },
        true,
      ).errors.join(),
    ).toContain('sorted');
    expect(validateQuestionFiles(manifest, {}, true).errors.join()).toContain('manifest');
    expect(
      validateQuestionFiles(
        manifest,
        { 'behavioral.json': [{ ...first, prompt: 'Describe <script> in your work.' }] },
        true,
      ).errors.join(),
    ).toContain('angle brackets');
    expect(
      validateQuestionFiles(
        manifest,
        { 'behavioral.json': [{ ...first, id: 'tec-999', type: 'technical-concepts' }] },
        true,
      ).errors.join(),
    ).toContain('file type');
    expect(
      validateQuestionFiles(manifest, { 'behavioral.json': [first, first] }, true).errors.join(),
    ).toContain('duplicate id');
    expect(
      validateQuestionFiles(
        manifest,
        { 'behavioral.json': [{ ...first, prompt: 'word '.repeat(46) }] },
        true,
      ).errors.length,
    ).toBeGreaterThan(0);
    expect(validateQuestionFiles({ bad: true }, {}, true).errors.length).toBeGreaterThan(0);
  });
  it('TC-018 UT-03 complete bank meets counts, topic limits and all 45 coverage cells', () => {
    const active = bank.questions.filter((q) => q.status === 'active');
    expect(active).toHaveLength(120);
    expect(checkBankRules(bank.questions)).toEqual([]);
    for (const [type, count] of [
      ['behavioral', 50],
      ['technical-concepts', 40],
      ['system-design-lite', 30],
    ] as const) {
      expect(active.filter((q) => q.type === type)).toHaveLength(count);
    }
    const behavioral = active.filter((q) => q.type === 'behavioral');
    expect(behavioral.filter((q) => q.roles.length === ROLES.length).length).toBeGreaterThanOrEqual(
      35,
    );
    expect(
      behavioral.filter((q) => q.seniority.length === 1 && q.seniority[0] === 'senior').length,
    ).toBeGreaterThanOrEqual(6);
    for (const role of ROLES) {
      expect(
        active.filter((q) => q.type === 'technical-concepts' && q.roles.includes(role)).length,
      ).toBeGreaterThanOrEqual(8);
      expect(
        active.filter(
          (q) =>
            q.type === 'system-design-lite' &&
            q.roles.includes(role) &&
            q.seniority.includes('junior'),
        ).length,
      ).toBeGreaterThanOrEqual(5);
    }
    for (const [type, count] of [
      ['behavioral', 6],
      ['technical-concepts', 8],
      ['system-design-lite', 6],
    ] as const) {
      expect(
        active.filter(
          (q) =>
            q.type === type &&
            q.roles.includes('ai-product-engineer') &&
            /^(ai-|llm-)/.test(q.topic),
        ).length,
      ).toBeGreaterThanOrEqual(count);
    }
  });
});
