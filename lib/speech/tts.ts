import { SPEECH } from '@/lib/config';
import type { SpeakResult } from './types';
export type { SpeakResult } from './types';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function primeSynthesis(synth: SpeechSynthesis): void {
  const utterance = new SpeechSynthesisUtterance(' ');
  utterance.volume = 0;
  synth.speak(utterance);
}

export async function speak(
  synth: SpeechSynthesis,
  chunks: string[],
  opts: {
    voice: SpeechSynthesisVoice | null;
    rate: number;
    onChunk(i: number): void;
    signal: AbortSignal;
  },
): Promise<SpeakResult> {
  const queued = synth.speaking || synth.pending;
  synth.cancel();
  synth.resume();
  if (opts.signal.aborted) return 'cancelled';
  if (queued) await new Promise<void>((resolve) => setTimeout(resolve, 50));
  for (const [index, chunk] of chunks.entries()) {
    // AbortSignal can change while the preceding delay or chunk is awaited.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (opts.signal.aborted) return 'cancelled';
    const result = await new Promise<SpeakResult>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      currentUtterance = utterance;
      utterance.voice = opts.voice;
      utterance.lang = opts.voice?.lang ?? SPEECH.LANG;
      utterance.rate = opts.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      let settled = false;
      const finish = (result: SpeakResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        opts.signal.removeEventListener('abort', abort);
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
        if (currentUtterance === utterance) currentUtterance = null;
        resolve(result);
      };
      const abort = () => {
        finish('cancelled');
        synth.cancel();
      };
      const timer = setTimeout(
        () => {
          finish('ended');
        },
        Math.max(4000, (chunk.length * 120) / opts.rate),
      );
      utterance.onstart = () => {
        opts.onChunk(index);
      };
      utterance.onend = () => {
        finish('ended');
      };
      utterance.onerror = (event) => {
        finish(event.error === 'interrupted' || event.error === 'canceled' ? 'cancelled' : 'error');
      };
      opts.signal.addEventListener('abort', abort, { once: true });
      try {
        synth.speak(utterance);
      } catch {
        finish('error');
      }
    });
    if (result !== 'ended') return result;
  }
  return 'ended';
}
