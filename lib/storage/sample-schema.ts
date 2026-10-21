import { z } from 'zod';
import { SessionRecordSchema, AnswerRecordSchema } from './schema';
export const SampleFileSchema = z
  .object({ session: SessionRecordSchema, answers: z.array(AnswerRecordSchema).length(3) })
  .strict()
  .superRefine((value, ctx) => {
    const { session, answers } = value;
    if (
      session.origin !== 'sample' ||
      session.token !== null ||
      session.status !== 'completed' ||
      session.summary === null ||
      session.questions.length !== 3
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Sample must be a completed three-question session with a summary and no token.',
      });
    if (
      answers.some(
        (answer, index) =>
          answer.index !== index ||
          answer.sessionId !== session.id ||
          answer.questionId !== session.questions[index]?.id ||
          answer.status !== 'scored' ||
          answer.feedback === null ||
          answer.feedbackMeta === null,
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Sample answers must be scored and match their session questions.',
      });
  });
export function validateSample(value: unknown, allowMock = false) {
  const sample = SampleFileSchema.parse(value);
  if (!allowMock && sample.answers.some((answer) => answer.feedbackMeta?.model === 'mock'))
    throw new Error('Sample contains mock feedback; owner live generation is required.');
  return sample;
}
