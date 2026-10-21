import type { WindowWithSpeech, SpeechRecognitionCtor } from './types';
export type Capabilities = {
  secureContext: boolean;
  recognition: boolean;
  synthesis: boolean;
  mediaDevices: boolean;
  indexedDb: boolean;
};

export function getRecognitionCtor(w: WindowWithSpeech): SpeechRecognitionCtor | null {
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Keep the normative TRD 9.1 browser boundary cast.
export function detectCapabilities(w: WindowWithSpeech = window as WindowWithSpeech): Capabilities {
  const secureContext = w.isSecureContext === true;
  return {
    secureContext,
    recognition: secureContext && getRecognitionCtor(w) !== null,
    synthesis:
      typeof w.speechSynthesis !== 'undefined' && typeof w.SpeechSynthesisUtterance === 'function',
    mediaDevices: typeof w.navigator?.mediaDevices?.getUserMedia === 'function',
    indexedDb: typeof w.indexedDB !== 'undefined' && w.indexedDB !== null,
  };
}

export type CapabilityNotice =
  'voice' | 'synthesis-only' | 'recognition-only' | 'none' | 'insecure';

export function capabilityNotice(c: Capabilities): CapabilityNotice {
  if (!c.secureContext) return 'insecure';
  if (c.recognition && c.synthesis) return 'voice';
  if (c.synthesis) return 'synthesis-only';
  if (c.recognition) return 'recognition-only';
  return 'none';
}
