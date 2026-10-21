import type { Timing, DeliveryMetrics } from '@/lib/storage/schema';
import { countWords } from './words';
import { countFillers } from './fillers';

// T-16 supplies the text branch; T-22 adds the normative voice timing calculation.
export function computeDelivery(
  a: { mode: 'text'; transcript: string; rawTranscript: string; timing: Timing },
  enabledFillers?: readonly string[],
): DeliveryMetrics {
  return {
    words: countWords(a.transcript),
    speakingMs: null,
    wpm: null,
    fillers: countFillers(a.transcript, enabledFillers),
    longestPauseMs: null,
    longPauses: null,
  };
}
