import { SPEECH } from '@/lib/config';
export function pauses(offsetsMs: readonly number[]): {
  longestPauseMs: number | null;
  longPauses: number | null;
} {
  if (offsetsMs.length < 2) return { longestPauseMs: null, longPauses: null };
  const s = [...offsetsMs].sort((a, b) => a - b);
  let longest = 0;
  let long = 0;
  for (let i = 1; i < s.length; i++) {
    const gap = (s[i] as number) - (s[i - 1] as number);
    if (gap > longest) longest = gap;
    if (gap >= SPEECH.LONG_PAUSE_MS) long++;
  }
  return { longestPauseMs: longest, longPauses: long };
}
