export type MicCheck = 'granted' | 'denied' | 'no-device' | 'error';
export type SpeakResult = 'ended' | 'cancelled' | 'error';
export type StopReason =
  'user' | 'time_limit' | 'char_cap' | 'tab_hidden' | 'network' | 'unexpected_stop';
export type FailKind = 'permission' | 'no-device' | 'no-speech' | 'unavailable';
