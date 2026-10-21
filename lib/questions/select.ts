import 'server-only';
import { randomBytes } from 'node:crypto';
import { QUESTION_BANK, type Role, type Seniority, type QuestionType } from '@/lib/config';
import type { Question } from './schema';
import { mulberry32, seedToInt, shuffle } from './prng';
// select.ts
export type SelectionInput = {
  role: Role;
  seniority: Seniority;
  types: readonly QuestionType[]; // non-empty
  length: 3 | 5;
  seed: string; // 8 lowercase hex chars
};

export function selectQuestions(bank: readonly Question[], input: SelectionInput): Question[] {
  const rng = mulberry32(seedToInt(input.seed));
  const types = QUESTION_BANK.TYPE_ORDER.filter((t) => input.types.includes(t));
  const active = [...bank]
    .filter((q) => q.status === 'active')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  // 1. Slot types: round-robin over the selected types from an rng-chosen offset.
  const offset = Math.floor(rng() * types.length);
  const slotTypes = Array.from(
    { length: input.length },
    (_, i) => types[(offset + i) % types.length] as QuestionType,
  );

  // 2. Pools, built and shuffled in TYPE_ORDER (consumes rng in a fixed order).
  const pools = new Map<QuestionType, Question[][]>();
  for (const t of types) {
    const ofType = active.filter((q) => q.type === t);
    const tier1 = ofType.filter(
      (q) => q.roles.includes(input.role) && q.seniority.includes(input.seniority),
    );
    const tier2 = ofType.filter((q) => q.roles.includes(input.role) && !tier1.includes(q));
    const tier3 = ofType.filter((q) => !tier1.includes(q) && !tier2.includes(q));
    pools.set(t, [shuffle(tier1, rng), shuffle(tier2, rng), shuffle(tier3, rng)]);
  }

  // 3. Fill each slot: prefer the first candidate (tier order) whose topic is unused,
  //    then the first unused candidate regardless of topic.
  const chosen: Question[] = [];
  const usedIds = new Set<string>();
  const usedTopics = new Set<string>();
  for (const t of slotTypes) {
    const tiers = pools.get(t) ?? [];
    const flat = tiers.flat().filter((q) => !usedIds.has(q.id));
    const pick = flat.find((q) => !usedTopics.has(q.topic)) ?? flat[0];
    if (!pick) throw new Error(`question bank exhausted for type ${t}`);
    chosen.push(pick);
    usedIds.add(pick.id);
    usedTopics.add(pick.topic);
  }

  // 4. Interview order: behavioral, then technical concepts, then system design lite (stable).
  const rank = (q: Question) => QUESTION_BANK.TYPE_ORDER.indexOf(q.type);
  return chosen
    .map((q, i) => ({ q, i }))
    .sort((a, b) => rank(a.q) - rank(b.q) || a.i - b.i)
    .map((x) => x.q);
}

export function newSeed(): string {
  return randomBytes(4).toString('hex'); // node:crypto, server only
}
