import { FILLERS } from '@/lib/config';
export function formatFillerBreakdown(byPhrase: Record<string, number>): string {
  const entries = FILLERS.map((f, index) => ({
    phrase: f.phrase,
    count: byPhrase[f.phrase] ?? 0,
    index,
  }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index);
  return entries.length === 0
    ? 'None counted'
    : `(${entries.map((f) => `${f.phrase} ${f.count}`).join(', ')})`;
}
