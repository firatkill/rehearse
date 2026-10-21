'use client';
import { useEffect, useState } from 'react';
import type { WindowWithSpeech } from '@/lib/speech/types';
import { loadVoices } from '@/lib/speech/voices';
export function useVoices() {
  const [state, setState] = useState<{ voices: SpeechSynthesisVoice[]; loading: boolean }>({
    voices: [],
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    const speechWindow: WindowWithSpeech = window;
    const synth = speechWindow.speechSynthesis;
    if (!synth) return;
    const refresh = () => {
      void loadVoices(synth).then((voices) => {
        if (alive) setState({ voices, loading: false });
      });
    };
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    return () => {
      alive = false;
      synth.removeEventListener('voiceschanged', refresh);
    };
  }, []);
  return state;
}
