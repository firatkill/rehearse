import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it, vi, afterEach } from 'vitest';
import { getBank } from '@/lib/questions/bank';
import { validateQuestionFiles } from '@/lib/questions/coverage';
import { ROLES, SENIORITIES, QUESTION_TYPES } from '@/lib/config';
import { selectQuestions } from '@/lib/questions/select';
import { getTurkishEvalQuestions } from '@/lib/eval/turkish';
import { getInterviewBank, getInterviewQuestion } from '@/lib/demo/catalog';
import { resetEnvForTests } from '@/lib/env';
import { practiceRole } from '@/lib/jobpost/repository';

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});
it('TC-210 V-63 independent Turkish bank meets the same schema, distribution and coverage rules', () => {
  const folder = 'content/questions-tr';
  const manifest: unknown = JSON.parse(readFileSync(`${folder}/manifest.json`, 'utf8'));
  const files = Object.fromEntries(
    readdirSync(folder)
      .filter((f) => f !== 'manifest.json')
      .map((f) => [f, JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as unknown]),
  );
  const checked = validateQuestionFiles(manifest, files);
  expect(checked.errors).toEqual([]);
  const bank = getBank('tr');
  expect([...bank.questions].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
    checked.questions.sort((a, b) => a.id.localeCompare(b.id)),
  );
  expect(getBank('tr')).toBe(bank);
  expect(bank.questions).toHaveLength(120);
  expect(bank.bankVersion).toBe('1.0.0');
  for (const [type, count, ai] of [
    ['behavioral', 50, 6],
    ['technical-concepts', 40, 8],
    ['system-design-lite', 30, 6],
  ] as const) {
    const questions = bank.questions.filter((q) => q.type === type && q.status === 'active');
    expect(questions).toHaveLength(count);
    expect(
      questions.filter((q) => q.roles.includes('ai-product-engineer') && q.topic.startsWith('ai-'))
        .length,
    ).toBeGreaterThanOrEqual(ai);
  }
  expect(
    bank.questions.filter((q) => q.type === 'behavioral' && q.roles.length === 5).length,
  ).toBeGreaterThanOrEqual(35);
  expect(
    bank.questions.filter(
      (q) => q.type === 'behavioral' && q.seniority.length === 1 && q.seniority[0] === 'senior',
    ).length,
  ).toBeGreaterThanOrEqual(6);
  for (const role of ROLES) {
    expect(
      bank.questions.filter((q) => q.type === 'technical-concepts' && q.roles.includes(role))
        .length,
    ).toBeGreaterThanOrEqual(8);
    for (const seniority of SENIORITIES)
      for (const type of QUESTION_TYPES) {
        const selected = selectQuestions(bank.questions, {
          role,
          seniority,
          types: [type],
          length: 5,
          seed: 'aabbccdd',
        });
        expect(selected).toHaveLength(5);
        expect(new Set(selected.map((q) => q.id)).size).toBe(5);
        expect(selected.every((q) => !getBank().byId.has(q.id))).toBe(true);
      }
  }
  for (const question of getTurkishEvalQuestions().questions)
    expect(bank.byId.get(question.id)).toEqual(question);
});
it('TC-210 signed language scopes bank lookup, while demo always uses its English catalogue', () => {
  vi.stubEnv('APP_EDITION', 'full');
  resetEnvForTests();
  expect(getInterviewQuestion('beh-501', 'tr')?.id).toBe('beh-501');
  expect(getInterviewQuestion('beh-501')).toBeUndefined();
  expect(getInterviewQuestion('beh-001', 'tr')).toBeUndefined();
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  expect(getInterviewBank('tr').questions).toEqual(getInterviewBank('en').questions);
  expect(getInterviewQuestion('beh-501', 'tr')).toBeUndefined();
});
it.each([
  ['Ön yüz mühendisi', 'frontend'],
  ['Arayüz geliştirici', 'frontend'],
  ['Arka uç geliştirici', 'backend'],
  ['Ürün mühendisi', 'product-engineer'],
  ['Yapay zekâ ürün mühendisi', 'ai-product-engineer'],
])('TC-211 Turkish job role %s maps to %s', (title, role) => {
  expect(practiceRole(title)).toBe(role);
});

it('TC-210 English bank bytes stay unchanged', () => {
  const hashes = {
    'content/questions/technical-concepts.json':
      'dd94a8e895c4457be7485fdd8e2e10c104472653fa979c0f29e79f7b77cff75a',
    'content/questions/system-design-lite.json':
      'a70c596519764f9497654a98ff70c9a0a93b1cc331c7440af065fd40b036504d',
    'content/questions/manifest.json':
      'c040ccc7d8c26fd78999380f1603163333493ce7a747f198eaafb463369a926a',
    'content/questions/behavioral.json':
      'be86a7895e93eaf4a5c6675af7f7b1a5e6a85bf141e077034da635e55530fcef',
  };
  for (const [file, hash] of Object.entries(hashes))
    expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(hash);
});
