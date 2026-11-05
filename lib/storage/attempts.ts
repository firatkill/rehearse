import { AttemptRecordSchema, FollowUpRecordSchema, type AnswerRecord } from './schema';

type Archivable = Omit<AnswerRecord, 'schemaVersion' | 'followUp' | 'followUpRecords'> & {
  schemaVersion: number;
  followUp?: AnswerRecord['followUp'];
  followUpRecords?: AnswerRecord['followUpRecords'];
};
export function completeAttempt<T extends Archivable>(answer: T): T {
  if (answer.status !== 'scored' && answer.status !== 'saved') return answer;
  if (answer.followUp) {
    const records = answer.followUpRecords ?? [];
    const ordinal = records.length + 1;
    const item = FollowUpRecordSchema.strip().parse({
      ...answer,
      ...answer.followUp,
      id: `${answer.sessionId}:${answer.index}:followup:${ordinal}`,
      ordinal,
    });
    return { ...answer, followUpRecords: [...records, item] };
  }
  const ordinal = answer.attemptRecords.length + 1;
  const attemptRecords = answer.attemptRecords;
  const bestAttemptId = answer.bestAttemptId;
  // Build a snapshot from a validated working record; omit slot-only fields.
  const attempt = AttemptRecordSchema.strip().parse({
    ...answer,
    id: `${answer.sessionId}:${answer.index}:${ordinal}`,
    ordinal,
  });
  const previousBest = attemptRecords.find((item) => item.id === bestAttemptId);
  return {
    ...answer,
    attemptRecords: [...attemptRecords, attempt],
    bestAttemptId:
      attempt.feedback &&
      (!previousBest?.feedback || attempt.feedback.overall > previousBest.feedback.overall)
        ? attempt.id
        : bestAttemptId,
  };
}

/** Read-only report projection; history and working response in storage remain untouched. */
export function bestAnswer(answer: AnswerRecord): AnswerRecord {
  const best = answer.attemptRecords.find((item) => item.id === answer.bestAttemptId);
  if (!best) return answer;
  return {
    ...answer,
    followUp: null,
    mode: best.mode,
    status: best.status,
    rawTranscript: best.rawTranscript,
    transcript: best.transcript,
    timing: best.timing,
    metrics: best.metrics,
    feedback: best.feedback,
    feedbackMeta: best.feedbackMeta,
    createdAt: best.createdAt,
    updatedAt: best.updatedAt,
  };
}
