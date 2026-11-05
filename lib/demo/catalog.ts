import 'server-only';
import { getJobRepository } from '@/lib/jobpost/repository';
import { generatedToQuestion } from '@/lib/jobpost/question';
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

export function getInterviewQuestion(id: string) {
  if (id.startsWith('gen-') && getEnv().APP_EDITION === 'full') {
    const repo = getJobRepository();
    const question = repo.generatedQuestion(id);
    const post = question ? repo.get(question.jobPostId) : null;
    return question && post ? generatedToQuestion(question, post) : undefined;
  }
  return getInterviewBank().byId.get(id);
}
