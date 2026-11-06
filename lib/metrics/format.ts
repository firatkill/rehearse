import { formatNumber } from '@/lib/i18n/numbers';
import { FILLERS, FILLERS_TR, type Language } from '@/lib/config';
export function formatFillerBreakdown(
  byPhrase: Record<string, number>,
  language: Language = 'en',
  empty = 'None counted',
): string {
  const phrases = language === 'tr' ? FILLERS_TR : FILLERS.map((f) => f.phrase);
  const entries = phrases
    .map((phrase, index) => ({
      phrase,
      count: byPhrase[phrase] ?? 0,
      index,
    }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index);
  return entries.length === 0
    ? empty
    : `(${entries.map((f) => `${f.phrase} ${formatNumber(f.count, language)}`).join(', ')})`;
}
