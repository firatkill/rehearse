import { DIMENSIONS, RECORDING_GUIDE, type Dimension } from '@/lib/config';
import type { Feedback } from '@/lib/feedback/schema';
import { fillerSpans } from '@/lib/metrics/fillers';
export type AnswerMark = { start: number; end: number; kind: 'strong' | 'vague' | 'filler' };
export function lowestDimension(feedback: Feedback): Dimension {
  const lowest = DIMENSIONS.reduce(
    (lowest, dimension) =>
      feedback.scores[dimension].score < feedback.scores[lowest].score ? dimension : lowest,
    DIMENSIONS[0],
  );
  return (
    feedback.improvements.find(
      (item) =>
        item.dimension !== undefined &&
        feedback.scores[item.dimension].score === feedback.scores[lowest].score,
    )?.dimension ?? lowest
  );
}
export function answerMarks(text: string, feedback: Feedback): AnswerMark[] {
  const marks: AnswerMark[] = fillerSpans(text).map((span) => ({ ...span, kind: 'filler' }));
  const add = (phrase: string, kind: AnswerMark['kind']) => {
    if (!phrase) return;
    let start = text.indexOf(phrase);
    while (start >= 0) {
      const end = start + phrase.length;
      if (!marks.some((mark) => start < mark.end && end > mark.start))
        marks.push({ start, end, kind });
      start = text.indexOf(phrase, end);
    }
  };
  for (const item of feedback.improvements)
    for (const phrase of item.vague_phrases ?? []) add(phrase, 'vague');
  for (const item of feedback.strengths) if (item.evidence) add(item.evidence, 'strong');
  return marks.sort((a, b) => a.start - b.start);
}
export function lengthVerdict(recordingMs: number | null): string {
  if (recordingMs === null) return 'Not available';
  return recordingMs < RECORDING_GUIDE.MIN_SECONDS * 1000
    ? 'Too short'
    : recordingMs <= RECORDING_GUIDE.MAX_SECONDS * 1000
      ? 'On target'
      : 'Long';
}
