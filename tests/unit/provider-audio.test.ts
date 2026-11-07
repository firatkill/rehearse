/* eslint-disable @typescript-eslint/unbound-method -- Mock methods are inspected, not invoked without their receiver. */
import { afterEach, expect, it, vi } from 'vitest';
import { playProviderAudio, primeAudio } from '@/lib/speech/provider-audio';
import { TTS } from '@/lib/config';
function fakeAudio() {
  return Object.assign(new EventTarget(), {
    src: '',
    volume: 1,
    playbackRate: 1,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
  }) as unknown as HTMLAudioElement;
}
afterEach(() => vi.useRealTimers());
it('TC-224 priming starts playback synchronously in the caller click stack', () => {
  const audio = fakeAudio();
  primeAudio(audio);
  expect(audio.play).toHaveBeenCalledOnce();
  expect(audio.volume).toBe(0);
});
it.each(['ended', 'abort', 'error'] as const)(
  'TC-224 %s releases playback and its object URL',
  async (ending) => {
    const audio = fakeAudio(),
      controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(44), { headers: { 'content-type': 'audio/wav' } }),
    );
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const playback = playProviderAudio(
      audio,
      { kind: 'preview', language: 'tr' },
      undefined,
      1.1,
      controller.signal,
    );
    const assertion =
      ending === 'error'
        ? expect(playback).rejects.toThrow('Speech unavailable')
        : expect(playback).resolves.toBeUndefined();
    await vi.waitFor(() => {
      expect(audio.play).toHaveBeenCalledOnce();
    });
    expect(audio.playbackRate).toBe(1.1);
    if (ending === 'abort') controller.abort();
    else audio.dispatchEvent(new Event(ending));
    await assertion;
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
    expect(revoke).toHaveBeenCalledOnce();
  },
);
it('TC-224 stalled playback is bounded and rejects for browser fallback', async () => {
  vi.useFakeTimers();
  const audio = fakeAudio();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(new Uint8Array(44), { headers: { 'content-type': 'audio/wav' } }),
  );
  const playback = playProviderAudio(
    audio,
    { kind: 'preview', language: 'en' },
    undefined,
    1,
    new AbortController().signal,
  );
  const assertion = expect(playback).rejects.toThrow('Speech timeout');
  await vi.waitFor(() => {
    expect(audio.play).toHaveBeenCalledOnce();
  });
  await vi.advanceTimersByTimeAsync(TTS.PLAYBACK_TIMEOUT_MS);
  await assertion;
  expect(audio.pause).toHaveBeenCalled();
});
