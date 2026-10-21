import {
  ROLES,
  SENIORITIES,
  QUESTION_TYPES,
  QUESTION_BANK,
  type Role,
  type Seniority,
  type QuestionType,
} from '@/lib/config';
import { ManifestSchema, QuestionSchema, type Question } from './schema';

export function coverageMatrix(
  questions: readonly Question[],
): Record<Role, Record<QuestionType, Record<Seniority, number>>> {
  return Object.fromEntries(
    ROLES.map((role) => [
      role,
      Object.fromEntries(
        QUESTION_TYPES.map((type) => [
          type,
          Object.fromEntries(
            SENIORITIES.map((seniority) => [
              seniority,
              questions.filter(
                (q) =>
                  q.status === 'active' &&
                  q.type === type &&
                  q.roles.includes(role) &&
                  q.seniority.includes(seniority),
              ).length,
            ]),
          ),
        ]),
      ),
    ]),
  ) as Record<Role, Record<QuestionType, Record<Seniority, number>>>;
}
export function checkBankRules(questions: readonly Question[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const topics = new Map<string, number>();
  for (const q of questions) {
    if (ids.has(q.id)) errors.push(`duplicate id: ${q.id}`);
    ids.add(q.id);
    const parsed = QuestionSchema.safeParse(q);
    if (!parsed.success) errors.push(`schema: ${q.id}: ${parsed.error.message}`);
    if (
      [q.prompt, ...q.follow_up_hints, ...q.what_good_looks_like].some((text) => /[<>]/.test(text))
    )
      errors.push(`angle brackets: ${q.id}`);
    if (q.status === 'active') topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
  }
  for (const [topic, count] of topics)
    if (count > QUESTION_BANK.MAX_PER_TOPIC)
      errors.push(`topic: ${topic} has ${count} active questions`);
  const matrix = coverageMatrix(questions);
  for (const role of ROLES)
    for (const type of QUESTION_TYPES)
      for (const seniority of SENIORITIES) {
        if (matrix[role][type][seniority] < QUESTION_BANK.MIN_PER_CELL)
          errors.push(
            `coverage: ${role}/${type}/${seniority} has ${matrix[role][type][seniority]}`,
          );
      }
  return errors;
}
export function validateQuestionFiles(
  manifestInput: unknown,
  files: Record<string, unknown>,
  allowIncomplete = false,
): { questions: Question[]; errors: string[] } {
  const manifest = ManifestSchema.safeParse(manifestInput);
  if (!manifest.success) return { questions: [], errors: [manifest.error.message] };
  const errors: string[] = [];
  const questions: Question[] = [];
  if (
    JSON.stringify(manifest.data.files.toSorted()) !== JSON.stringify(Object.keys(files).toSorted())
  )
    errors.push('manifest files do not match question files');
  for (const [file, input] of Object.entries(files)) {
    const parsed = QuestionSchema.array().safeParse(input);
    if (!parsed.success) {
      errors.push(`${file}: ${parsed.error.message}`);
      continue;
    }
    const ids = parsed.data.map((q) => q.id);
    if (JSON.stringify(ids) !== JSON.stringify(ids.toSorted()))
      errors.push(`${file}: ids must be sorted`);
    if (parsed.data.some((q) => `${q.type}.json` !== file))
      errors.push(`${file}: incorrect file type`);
    questions.push(...parsed.data);
  }
  errors.push(
    ...checkBankRules(questions).filter((e) => !allowIncomplete || !e.startsWith('coverage:')),
  );
  return { questions, errors };
}
