export type MicCheck = 'granted' | 'denied' | 'no-device' | 'error';
export type SpeakResult = 'ended' | 'cancelled' | 'error';
export type StopReason =
  'user' | 'time_limit' | 'char_cap' | 'tab_hidden' | 'network' | 'unexpected_stop';
export type FailKind = 'permission' | 'no-device' | 'no-speech' | 'unavailable';
export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string; confidence?: number };
  }>;
};
export type SpeechRecognitionErrorEventLike = { error: string; message?: string };
export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
export type WindowWithSpeech = {
  isSecureContext?: boolean;
  navigator?: { mediaDevices?: Pick<MediaDevices, 'getUserMedia'> };
  indexedDB?: IDBFactory | null;
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
};
