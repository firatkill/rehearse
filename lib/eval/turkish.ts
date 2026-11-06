import 'server-only';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { QuestionSchema } from '@/lib/questions/schema';
import { getBank } from '@/lib/questions/bank';
/** Keep the evaluated context identical to the questions served in Turkish sessions. */
export function getTurkishEvalQuestions() {
  const bank = getBank('tr');
  const questions = z
    .array(QuestionSchema)
    .parse(JSON.parse(readFileSync('eval/turkish/questions.json', 'utf8')));
  for (const question of questions) {
    if (JSON.stringify(bank.byId.get(question.id)) !== JSON.stringify(question))
      throw new Error(`Turkish evaluation question differs from bank: ${question.id}`);
  }
  return {
    bankVersion: bank.bankVersion,
    questions,
  };
}
