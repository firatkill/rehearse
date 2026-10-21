import type { FailKind } from './types';
export function recognitionFailure(code: string): FailKind {
  if (code === 'not-allowed') return 'permission';
  if (code === 'audio-capture') return 'no-device';
  return 'unavailable';
}
