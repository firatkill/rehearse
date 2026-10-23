import 'server-only';
import { z } from 'zod';
import { ROLES, SENIORITIES, ANSWER_MODES, ANSWER, DIMENSIONS, type Dimension } from '@/lib/config';
import { countWords } from '@/lib/metrics/words';
import type { Question } from '@/lib/questions/schema';

const Range = z
  .tuple([z.number().int().min(1).max(4), z.number().int().min(1).max(4)])
  .refine(([lo, hi]) => lo <= hi, 'range low must be ≤ high');

export const GoldenItemSchema = z
  .object({
    id: z.string().regex(/^g-\d{2}$/),
    question_id: z.string().regex(/^(beh|tec|sdl)-\d{3}$/),
    role: z.enum(ROLES),
    seniority: z.enum(SENIORITIES),
    mode: z.enum(ANSWER_MODES),
    category: z.enum(['strong', 'average', 'weak', 'off-topic', 'very-short', 'injection']),
    triple: z.string().regex(/^t\d$/).nullable(), // groups a strong/average/weak set on one question
    transcript: z.string().min(1).max(ANSWER.MAX_CHARS),
    expected: z
      .object(
        Object.fromEntries(DIMENSIONS.map((d) => [d, Range])) as Record<Dimension, typeof Range>,
      )
      .strict(),
    expected_flags: z
      .object({
        off_topic: z.boolean().optional(),
        too_short: z.boolean().optional(),
        injection_suspected: z.boolean().optional(),
      })
      .strict(),
    canary: z.string().min(4).nullable(), // injection items: must not appear in any output text
    notes: z.string(),
  })
  .strict();

export type GoldenItem = z.infer<typeof GoldenItemSchema>;

/** Validate the corpus-level requirements in TRD §18.2 after the strict boundary schema. */
export function validateGolden(source: string, questions: readonly Question[]): GoldenItem[] {
  const lines = source.trim().split(/\r?\n/);
  if (lines.length !== 24) throw new Error('Golden set must contain 24 lines');
  const items = lines.map((line, index) => {
    try {
      const value: unknown = JSON.parse(line);
      return GoldenItemSchema.parse(value);
    } catch {
      throw new Error(`Invalid golden item on line ${index + 1}`);
    }
  });
  const ids = new Set(items.map((item) => item.id));
  if (
    ids.size !== 24 ||
    items.some((item) => Number(item.id.slice(2)) < 1 || Number(item.id.slice(2)) > 24)
  )
    throw new Error('Golden ids must be unique g-01 through g-24');
  const bank = new Map(questions.map((question) => [question.id, question]));
  for (const item of items) {
    const question = bank.get(item.question_id);
    if (
      !question ||
      question.status !== 'active' ||
      !question.roles.includes(item.role) ||
      !question.seniority.includes(item.seniority)
    )
      throw new Error(`${item.id}: question must be active and eligible`);
    if (item.category === 'very-short' && countWords(item.transcript) >= ANSWER.SHORT_WORDS)
      throw new Error(
        `${item.id}: very-short answer must have fewer than ${ANSWER.SHORT_WORDS} words`,
      );
    if (item.category === 'injection' && item.canary === null)
      throw new Error(`${item.id}: injection answer needs a canary`);
    if (
      item.category === 'off-topic' &&
      (item.expected.relevance[0] !== 1 || item.expected.relevance[1] !== 1)
    )
      throw new Error(`${item.id}: off-topic relevance must be [1, 1]`);
    if (!['strong', 'average', 'weak'].includes(item.category) && item.triple !== null)
      throw new Error(`${item.id}: non-triple item must have triple null`);
  }
  for (const [category, expected] of Object.entries({
    strong: 6,
    average: 6,
    weak: 6,
    'off-topic': 2,
    'very-short': 2,
    injection: 2,
  })) {
    if (items.filter((item) => item.category === category).length !== expected)
      throw new Error(`Golden category ${category} must contain ${expected} items`);
  }
  const types: string[] = [];
  for (let n = 1; n <= 6; n++) {
    const triple = items.filter((item) => item.triple === `t${n}`);
    if (
      triple.length !== 3 ||
      ['strong', 'average', 'weak'].some(
        (category) => triple.filter((item) => item.category === category).length !== 1,
      ) ||
      new Set(triple.map((item) => item.question_id)).size !== 1
    )
      throw new Error(`Triple t${n} must contain strong, average and weak answers on one question`);
    const first = triple[0];
    const question = first ? bank.get(first.question_id) : undefined;
    if (question) types.push(question.type);
  }
  if (
    types.filter((type) => type === 'behavioral').length < 2 ||
    types.filter((type) => type === 'technical-concepts').length < 2 ||
    !types.includes('system-design-lite')
  )
    throw new Error(
      'Golden triples need two behavioral, two technical and one system design question',
    );
  if (items.filter((item) => item.mode === 'voice').length < 2)
    throw new Error('Golden set needs at least two recognition-style voice answers');
  return items;
}
