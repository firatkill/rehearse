import 'server-only';
import { DIMENSIONS, JOBPOST, QUESTION_BANK, SENIORITIES } from '@/lib/config';
import type { Question } from '@/lib/questions/schema';
import { jobFeedbackType } from '@/lib/storage/jobpost-schema';
import type { GeneratedQuestionRecord, JobPostRecord } from '@/lib/storage/jobpost-schema';
export function generatedToQuestion(
  question: GeneratedQuestionRecord,
  post: JobPostRecord,
): Question {
  const type = jobFeedbackType(question.type);
  return {
    id: question.id,
    type,
    roles: [post.practiceRole],
    seniority: [...SENIORITIES],
    dimensions: [...DIMENSIONS],
    topic: `job-${question.type}`,
    prompt: question.text,
    follow_up_hints: [...JOBPOST.FOLLOW_UP_HINTS],
    what_good_looks_like: question.listenFor,
    time_limit_s: QUESTION_BANK.DEFAULT_TIME_LIMIT_S[type],
    status: 'active',
    added_in: '2.0.0',
  };
}
