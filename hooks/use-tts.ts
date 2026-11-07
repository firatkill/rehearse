'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak, type SpeakResult } from '@/lib/speech/tts';
import { primeAudio, playProviderAudio } from '@/lib/speech/provider-audio';
import { useProviderSpeech } from '@/lib/speech/provider-context';
import type { TtsRequest } from '@/lib/api/tts-contract';
import type { Language } from '@/lib/config';
export function useTTS() {
  const provider = useProviderSpeech();
  const audio = useRef<HTMLAudioElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<Promise<SpeakResult> | null>(null);
  const [activeChunk, setActiveChunk] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const prime = useCallback(() => {
    if (!provider) return;
    audio.current ??= new Audio();
    primeAudio(audio.current);
  }, [provider]);
  const cancel = useCallback(async () => {
    controller.current?.abort();
    audio.current?.pause();
    return await pending.current;
  }, []);
  const play = useCallback(
    (
      synth: SpeechSynthesis | undefined,
      chunks: string[],
      voice: SpeechSynthesisVoice | null,
      rate: number,
      language: Language = 'en',
      source?: { input: TtsRequest; token?: string },
    ) => {
      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      setSpeaking(true);
      setActiveChunk(null);
      setFellBack(false);
      const run = async (): Promise<SpeakResult> => {
        if (provider && source) {
          try {
            audio.current ??= new Audio();
            await playProviderAudio(audio.current, source.input, source.token, rate, own.signal);
            return own.signal.aborted ? 'cancelled' : 'ended';
          } catch {
            if (own.signal.aborted) return 'cancelled';
            setFellBack(true);
          }
        }
        if (!synth) return 'error';
        return speak(synth, chunks, {
          voice,
          rate,
          language,
          signal: own.signal,
          onChunk: setActiveChunk,
        });
      };
      const result = run().finally(() => {
        if (controller.current === own) {
          setSpeaking(false);
          setActiveChunk(null);
        }
      });
      pending.current = result;
      return result;
    },
    [provider],
  );
  useEffect(() => {
    const stop = () => {
      controller.current?.abort();
      audio.current?.pause();
    };
    window.addEventListener('pagehide', stop);
    return () => {
      stop();
      window.removeEventListener('pagehide', stop);
    };
  }, []);
  return { play, cancel, prime, provider, fellBack, activeChunk, speaking };
}
