import { DIMENSIONS } from '@/lib/config';
import type { ProgressEntry } from '@/lib/report/progress';
import { record } from './records';
export function entries(count: number): ProgressEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    session: {
      ...record,
      id: `session-${index}`,
      status: 'completed',
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    },
    overall: index < 9 ? 2 : 4,
    dimensionMeans: Object.fromEntries(
      DIMENSIONS.map((d) => [d, index < 9 ? 2 : 4]),
    ) as ProgressEntry['dimensionMeans'],
    answers: 3,
    retries: 0,
    recordingMs: 60_000,
  }));
}
