import 'server-only';
import type { SessionRepository } from '@/lib/storage/repository';
import type { AnswerRecord, SessionRecord } from '@/lib/storage/schema';
import type { createJobRepository } from './repository';
import { UpcomingResponseSchema } from '@/lib/api/upcoming-contracts';
/** Draft/review/skipped answers do not count. A saved original attempt still counts during a retry. */
export function answeredQuestionIds(
  bundles: { session: SessionRecord; answers: AnswerRecord[] }[],
) {
  const answered = new Set<string>();
  for (const { session, answers } of bundles)
    for (const answer of answers) {
      if (session.questions[answer.index]?.id !== answer.questionId) continue;
      const completed = answer.attemptRecords.some(
        (attempt) => attempt.transcript.trim().length > 0,
      );
      const submitted =
        ['submitted', 'scored', 'saved'].includes(answer.status) &&
        answer.transcript.trim().length > 0;
      if (completed || submitted) answered.add(answer.questionId);
    }
  return answered;
}
export async function upcomingPosts(
  jobs: ReturnType<typeof createJobRepository>,
  sessions: SessionRepository,
) {
  const dated = jobs.list().filter((post) => post.interviewDate !== null);
  if (!dated.length) return { posts: [] };
  const listed = await sessions.listSessions();
  const answered = answeredQuestionIds(
    await Promise.all(
      listed.sessions.map(async (session) => ({
        session,
        answers: await sessions.getAnswers(session.id),
      })),
    ),
  );
  return UpcomingResponseSchema.parse({
    posts: dated.map((post) => {
      const questions = jobs.questions(post.id);
      return {
        id: post.id,
        company: post.company,
        role: post.role,
        interviewDate: post.interviewDate,
        total: questions.length,
        answered: questions.filter((question) => answered.has(question.id)).length,
      };
    }),
  });
}
