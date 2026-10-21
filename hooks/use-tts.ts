'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from '@/lib/speech/tts';
import type { SpeakResult } from '@/lib/speech/types';
export function useTTS() {
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<Promise<SpeakResult> | null>(null);
  const [activeChunk, setActiveChunk] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const cancel = useCallback(async () => {
    controller.current?.abort();
    return await pending.current;
  }, []);
  const play = useCallback(
    (
      synth: SpeechSynthesis,
      chunks: string[],
      voice: SpeechSynthesisVoice | null,
      rate: number,
    ) => {
      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      setSpeaking(true);
      setActiveChunk(null);
      const result = speak(synth, chunks, {
        voice,
        rate,
        signal: own.signal,
        onChunk: setActiveChunk,
      }).finally(() => {
        if (controller.current === own) {
          setSpeaking(false);
          setActiveChunk(null);
        }
      });
      pending.current = result;
      return result;
    },
    [],
  );
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  return { play, cancel, activeChunk, speaking };
}
