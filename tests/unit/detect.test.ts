import { afterEach, expect, it, vi } from 'vitest';
import { capabilityNotice, detectCapabilities, getRecognitionCtor } from '@/lib/speech/detect';
import { checkMicrophone } from '@/lib/speech/microphone';
import type { WindowWithSpeech } from '@/lib/speech/types';
const ctor = class {
  marker = true;
};
const fake = (patch: Record<string, unknown> = {}) =>
  ({
    isSecureContext: true,
    webkitSpeechRecognition: ctor,
    speechSynthesis: {},
    SpeechSynthesisUtterance: class {
      marker = true;
    },
    navigator: { mediaDevices: { getUserMedia: vi.fn() } },
    indexedDB: {},
    ...patch,
  }) as unknown as WindowWithSpeech;
afterEach(() => {
  vi.unstubAllGlobals();
});
it('TC-046 UT-20 secure feature detection and constructor precedence', () => {
  const w = fake();
  expect(detectCapabilities(w)).toEqual({
    secureContext: true,
    recognition: true,
    synthesis: true,
    mediaDevices: true,
    indexedDb: true,
  });
  expect(getRecognitionCtor(w)).toBe(ctor);
  const unprefixed = class {
    marker = true;
  };
  expect(getRecognitionCtor(fake({ SpeechRecognition: unprefixed }))).toBe(unprefixed);
  vi.stubGlobal('window', w);
  expect(detectCapabilities()).toEqual(detectCapabilities(w));
});
it.each([
  [{}, 'voice'],
  [{ webkitSpeechRecognition: undefined }, 'synthesis-only'],
  [{ speechSynthesis: undefined }, 'recognition-only'],
  [{ webkitSpeechRecognition: undefined, speechSynthesis: undefined }, 'none'],
  [{ isSecureContext: false }, 'insecure'],
] as const)('TC-046 UT-20 capabilities select %s notice', (patch, notice) => {
  const capabilities = detectCapabilities(fake(patch));
  expect(capabilityNotice(capabilities)).toBe(notice);
  if (notice === 'insecure') expect(capabilities.recognition).toBe(false);
});
it('TC-046 UT-20 absent IndexedDB, media devices and utterance constructor', () => {
  expect(
    detectCapabilities(
      fake({ indexedDB: null, navigator: {}, SpeechSynthesisUtterance: undefined }),
    ),
  ).toMatchObject({ indexedDb: false, mediaDevices: false, synthesis: false });
  expect(detectCapabilities(fake({ indexedDB: undefined })).indexedDb).toBe(false);
});
it('TC-047 UT-20 microphone permission immediately stops every track', async () => {
  const stops = [vi.fn(), vi.fn()];
  const getUserMedia = vi
    .fn()
    .mockResolvedValue({ getTracks: () => stops.map((stop) => ({ stop })) });
  const media = { getUserMedia } as unknown as MediaDevices;
  expect(await checkMicrophone(media)).toBe('granted');
  expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  for (const stop of stops) expect(stop).toHaveBeenCalledOnce();
  vi.stubGlobal('navigator', { mediaDevices: media });
  expect(await checkMicrophone()).toBe('granted');
});
it.each([
  ['NotAllowedError', 'denied'],
  ['SecurityError', 'denied'],
  ['NotFoundError', 'no-device'],
  ['OverconstrainedError', 'no-device'],
  ['NotReadableError', 'error'],
] as const)('TC-047 UT-20 microphone maps %s', async (name, result) => {
  const md = {
    getUserMedia: vi.fn().mockRejectedValue(new DOMException('fake', name)),
  } as unknown as MediaDevices;
  expect(await checkMicrophone(md)).toBe(result);
});
it('TC-047 UT-20 unknown microphone errors remain generic', async () => {
  const md = {
    getUserMedia: vi.fn().mockRejectedValue(new Error('fake')),
  } as unknown as MediaDevices;
  expect(await checkMicrophone(md)).toBe('error');
});
