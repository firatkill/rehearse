import 'server-only';
import manifest from '@/content/questions/manifest.json';
import behavioral from '@/content/questions/behavioral.json';
import technical from '@/content/questions/technical-concepts.json';
import design from '@/content/questions/system-design-lite.json';
import turkishManifest from '@/content/questions-tr/manifest.json';
import turkishBehavioral from '@/content/questions-tr/behavioral.json';
import turkishTechnical from '@/content/questions-tr/technical-concepts.json';
import turkishDesign from '@/content/questions-tr/system-design-lite.json';
import type { Language } from '@/lib/config';
import { ManifestSchema, QuestionSchema, type Question } from './schema';

type Bank = {
  bankVersion: string;
  questions: readonly Question[];
  byId: ReadonlyMap<string, Question>;
};
const banks = new Map<Language, Bank>();
export function getBank(language: Language = 'en'): Bank {
  const bank = banks.get(language);
  if (bank) return bank;
  const { bankVersion } = ManifestSchema.parse(language === 'tr' ? turkishManifest : manifest);
  const questions = QuestionSchema.array().parse(
    language === 'tr'
      ? [...turkishBehavioral, ...turkishTechnical, ...turkishDesign]
      : [...behavioral, ...technical, ...design],
  );
  const loaded = { bankVersion, questions, byId: new Map(questions.map((q) => [q.id, q])) };
  banks.set(language, loaded);
  return loaded;
}
