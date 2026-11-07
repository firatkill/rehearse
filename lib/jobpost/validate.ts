import 'server-only';
import { JOBPOST } from '@/lib/config';
import type { JobGeneration } from './schema';
import { normaliseJobText, groundedJobQuote } from '@/lib/storage/job-analysis';
export { normaliseJobText } from '@/lib/storage/job-analysis';
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
  for (const question of questions) {
    if (!groundedJobQuote(question.groundingQuote, text)) {
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
    groundingRate: questions.length ? (questions.length - ungrounded) / questions.length : 0,
  };
}
