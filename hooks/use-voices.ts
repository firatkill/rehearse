'use client';
import type { Language } from '@/lib/config';
import { useEffect, useState } from 'react';
import type { WindowWithSpeech } from '@/lib/speech/types';
import { loadVoices } from '@/lib/speech/voices';
export function useVoices(language: Language = 'en') {
  const [state, setState] = useState<{
    voices: SpeechSynthesisVoice[];
    loading: boolean;
    language: Language;
  }>({
    language,
    voices: [],
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    const speechWindow: WindowWithSpeech = window;
    const synth = speechWindow.speechSynthesis;
    if (!synth) return;
    const refresh = () => {
      void loadVoices(synth, undefined, language).then((voices) => {
        if (alive) setState({ voices, loading: false, language });
      });
    };
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    return () => {
      alive = false;
      synth.removeEventListener('voiceschanged', refresh);
    };
  }, [language]);
  return state.language === language ? state : { voices: [], loading: true, language };
}
