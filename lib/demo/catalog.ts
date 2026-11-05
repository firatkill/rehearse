import 'server-only';
import { getEnv } from '@/lib/env';
import { getBank } from '@/lib/questions/bank';
import { demoFeedback, demoJobs } from './content';
export function getInterviewBank() {
  const bank = getBank();
  if (getEnv().APP_EDITION === 'full') return bank;
  const questions = [
    ...bank.questions.filter((q) => demoFeedback.some((f) => f.questionId === q.id)),
    ...demoJobs.flatMap((job) => job.questions),
  ];
  return { ...bank, questions, byId: new Map(questions.map((q) => [q.id, q])) };
}
