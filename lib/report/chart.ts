import type { Aggregates } from './aggregate';
export type ChartPoint = { x: number; y: number; index: number };
export function chartSegments(questions: Aggregates['perQuestion']): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];
  for (const [position, question] of questions.entries()) {
    if (question.overall === null) {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    current.push({
      index: question.index,
      x: 48 + (questions.length > 1 ? (position * 528) / (questions.length - 1) : 0),
      y: 168 - ((question.overall - 1) * 152) / 3,
    });
  }
  if (current.length) segments.push(current);
  return segments;
}
