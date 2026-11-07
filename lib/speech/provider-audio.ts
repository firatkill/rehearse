import { TTS } from '@/lib/config';
import type { TtsRequest } from '@/lib/api/tts-contract';
import { pcmWave } from '@/lib/tts/audio';
/** Must be invoked synchronously from the user's click, before any async work. */
export function primeAudio(audio: HTMLAudioElement): void {
  const url = URL.createObjectURL(new Blob([pcmWave(new Uint8Array(480))], { type: 'audio/wav' }));
  audio.src = url;
  audio.volume = 0;
  void audio
    .play()
    .catch(() => undefined)
    .finally(() => {
      URL.revokeObjectURL(url);
    });
}
export async function playProviderAudio(
  audio: HTMLAudioElement,
  input: TtsRequest,
  token: string | undefined,
  rate: number,
  signal: AbortSignal,
): Promise<void> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(TTS.PROVIDER_TIMEOUT_MS)]);
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-rehearse-session': token } : {}),
    },
    body: JSON.stringify(input),
    signal: requestSignal,
  });
  if (!response.ok || response.headers.get('content-type') !== 'audio/wav')
    throw new Error('Speech unavailable');
  const blob = await response.blob();
  if (blob.size > TTS.MAX_AUDIO_BYTES || blob.size === 0) throw new Error('Speech unavailable');
  if (signal.aborted) return;
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        finish(new Error('Speech timeout'));
      }, TTS.PLAYBACK_TIMEOUT_MS);
      const done = () => {
        finish();
      };
      const failed = () => {
        finish(new Error('Speech unavailable'));
      };
      const aborted = () => {
        finish();
      };
      const finish = (error?: Error) => {
        clearTimeout(timer);
        audio.removeEventListener('ended', done);
        audio.removeEventListener('error', failed);
        signal.removeEventListener('abort', aborted);
        audio.pause();
        audio.removeAttribute('src');
        if (error) reject(error);
        else resolve();
      };
      audio.addEventListener('ended', done, { once: true });
      audio.addEventListener('error', failed, { once: true });
      signal.addEventListener('abort', aborted, { once: true });
      audio.src = url;
      audio.volume = 1;
      audio.playbackRate = rate;
      void audio.play().catch(failed);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
