import 'server-only';
import manifest from '@/content/questions/manifest.json';
import behavioral from '@/content/questions/behavioral.json';
import technical from '@/content/questions/technical-concepts.json';
import design from '@/content/questions/system-design-lite.json';
import { ManifestSchema, QuestionSchema, type Question } from './schema';

type Bank = {
  bankVersion: string;
  questions: readonly Question[];
  byId: ReadonlyMap<string, Question>;
};
let bank: Bank | undefined;
export function getBank(): Bank {
  if (bank) return bank;
  const { bankVersion } = ManifestSchema.parse(manifest);
  const questions = QuestionSchema.array().parse([...behavioral, ...technical, ...design]);
  bank = { bankVersion, questions, byId: new Map(questions.map((q) => [q.id, q])) };
  return bank;
}
