import 'server-only';
import { JOBPOST } from '@/lib/config';
import type { JobGeneration } from './schema';
export function normaliseJobText(text: string): string {
  return text
    .normalize('NFKC')
    .replaceAll('‹', '<')
    .replaceAll('›', '>')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}
export function questionOverlap(a: string, b: string): number {
  const tokens = (text: string) => new Set(normaliseJobText(text).match(/[\p{L}\p{N}]+/gu) ?? []);
  const x = tokens(a),
    y = tokens(b);
  const union = new Set([...x, ...y]);
  return union.size ? [...x].filter((token) => y.has(token)).length / union.size : 1;
}
export function validateJobQuestions(
  questions: JobGeneration['questions'],
  text: string,
  existing: readonly string[],
) {
  const accepted: JobGeneration['questions'] = [];
  let ungrounded = 0,
    duplicates = 0;
  const source = normaliseJobText(text);
  for (const question of questions) {
    if (!source.includes(normaliseJobText(question.groundingQuote))) {
      ungrounded++;
      continue;
    }
    if (
      [...existing, ...accepted.map((item) => item.text)].some(
        (other) => questionOverlap(question.text, other) >= JOBPOST.DUPLICATE_THRESHOLD,
      )
    ) {
      duplicates++;
      continue;
    }
    accepted.push(question);
  }
  return {
    questions: accepted,
    ungrounded,
    duplicates,
    groundingRate: (questions.length - ungrounded) / questions.length,
  };
}
