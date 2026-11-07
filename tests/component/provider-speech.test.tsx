import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useTTS } from '@/hooks/use-tts';
import { SpeechProvider } from '@/lib/speech/provider-context';
import * as playback from '@/lib/speech/provider-audio';
import * as browser from '@/lib/speech/tts';
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});
const wrapper = ({ children }: { children: ReactNode }) => (
  <SpeechProvider enabled>{children}</SpeechProvider>
);
it.each(['unmount', 'pagehide'] as const)(
  'TC-224 %s cancels pending provider playback',
  async (exit) => {
    let signal: AbortSignal | undefined;
    vi.spyOn(playback, 'playProviderAudio').mockImplementation(
      (_audio, _body, _token, _rate, own) => {
        signal = own;
        return new Promise((resolve) => {
          own.addEventListener(
            'abort',
            () => {
              resolve();
            },
            { once: true },
          );
        });
      },
    );
    const { result, unmount } = renderHook(() => useTTS(), { wrapper });
    let pending: Promise<unknown> | undefined;
    act(() => {
      pending = result.current.play(undefined, ['Question'], null, 1, 'en', {
        input: { kind: 'preview', language: 'en' },
      });
    });
    if (exit === 'unmount') unmount();
    else
      act(() => {
        window.dispatchEvent(new Event('pagehide'));
      });
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      await pending;
    });
  },
);
it('TC-224 provider failure falls back for the same utterance and exposes a quiet notice', async () => {
  vi.spyOn(playback, 'playProviderAudio').mockRejectedValue(new Error('unavailable'));
  const speak = vi.spyOn(browser, 'speak').mockResolvedValue('ended');
  const { result } = renderHook(() => useTTS(), { wrapper });
  await act(async () => {
    await result.current.play({} as SpeechSynthesis, ['Question'], null, 1, 'tr', {
      input: { kind: 'preview', language: 'tr' },
    });
  });
  expect(speak).toHaveBeenCalledWith({}, ['Question'], expect.objectContaining({ language: 'tr' }));
  expect(result.current.fellBack).toBe(true);
  expect(result.current.speaking).toBe(false);
});
