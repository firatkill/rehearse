import { SPEECH } from '@/lib/config';
import type { SpeechRecognitionCtor, SpeechRecognitionEventLike } from './types';
export type RecognizerHandlers = {
  onStart(): void;
  onResult(e: SpeechRecognitionEventLike): void;
  onError(code: string): void;
  onEnd(): void;
};

export function createRecognizer(
  Ctor: SpeechRecognitionCtor,
  h: RecognizerHandlers,
): { start(): void; stop(): void; abort(): void } {
  const r = new Ctor();
  r.lang = SPEECH.LANG;
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.onstart = () => {
    h.onStart();
  };
  r.onresult = (e) => {
    h.onResult(e);
  };
  r.onerror = (e) => {
    h.onError(e.error);
  };
  r.onend = () => {
    h.onEnd();
  };
  return {
    start: () => {
      r.start();
    },
    stop: () => {
      r.stop();
    },
    abort: () => {
      r.abort();
    },
  };
}
