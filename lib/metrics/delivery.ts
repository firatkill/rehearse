import { SPEECH, type AnswerMode } from '@/lib/config';
import type { Timing, DeliveryMetrics } from '@/lib/storage/schema';
import { countWords } from './words';
import { countFillers } from './fillers';
import { pauses } from './pauses';
export function computeDelivery(
  a: { mode: AnswerMode; transcript: string; rawTranscript: string; timing: Timing },
  enabledFillers?: readonly string[],
): DeliveryMetrics {
  const words = countWords(a.transcript);
  const fillers = countFillers(a.mode === 'voice' ? a.rawTranscript : a.transcript, enabledFillers);
  if (a.mode === 'text')
    return { words, speakingMs: null, wpm: null, fillers, longestPauseMs: null, longPauses: null };
  const { firstResultOffsetMs, resultOffsetsMs } = a.timing;
  const lastResultOffsetMs = resultOffsetsMs.length > 0 ? Math.max(...resultOffsetsMs) : null;
  const speakingMs =
    firstResultOffsetMs !== null && lastResultOffsetMs !== null
      ? Math.max(0, lastResultOffsetMs - firstResultOffsetMs)
      : null;
  const wpm =
    speakingMs !== null && speakingMs >= SPEECH.MIN_PACE_SPEAKING_MS
      ? Math.round(countWords(a.rawTranscript) / (speakingMs / 60_000))
      : null;
  const p = pauses(resultOffsetsMs);
  return {
    words,
    speakingMs,
    wpm,
    fillers,
    longestPauseMs: p.longestPauseMs,
    longPauses: p.longPauses,
  };
}
