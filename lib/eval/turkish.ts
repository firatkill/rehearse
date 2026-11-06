import 'server-only';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { QuestionSchema } from '@/lib/questions/schema';
/** Independent evaluation fixtures until the separately authored V-63 bank is available. */
export function getTurkishEvalQuestions() {
  return {
    bankVersion: '1.0.0',
    questions: z
      .array(QuestionSchema)
      .parse(JSON.parse(readFileSync('eval/turkish/questions.json', 'utf8'))),
  };
}
