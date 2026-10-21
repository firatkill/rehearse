/* eslint-disable @typescript-eslint/unbound-method -- Speech methods are vi.fn mocks, not detached browser calls. */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { chunkForSpeech } from '@/lib/speech/chunk';
import { loadVoices, pickVoice } from '@/lib/speech/voices';
import { primeSynthesis, speak } from '@/lib/speech/tts';
import { SPEECH } from '@/lib/config';
class Utterance {
  constructor(public text: string) {}
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
}
function fakeSynth() {
  const events = new EventTarget();
  const spoken: Utterance[] = [];
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    cancel: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    getVoices: vi.fn((): SpeechSynthesisVoice[] => []),
    speak: vi.fn((u: Utterance) => {
      spoken.push(u);
    }),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    onvoiceschanged: null,
  };
  return { synth: synth as unknown as SpeechSynthesis, spoken, events };
}
const voice = (
  name: string,
  lang: string,
  localService = true,
  isDefault = false,
): SpeechSynthesisVoice => ({ name, lang, localService, default: isDefault, voiceURI: name });
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test('TC-054 UT-19 FR-09 chunks sentences, whitespace, long words and unpunctuated text', () => {
  expect(chunkForSpeech(' One.  Two? Three! ')).toEqual(['One.', 'Two?', 'Three!']);
  expect(chunkForSpeech('word '.repeat(40))).toEqual([
    'word '.repeat(32).trim(),
    'word '.repeat(8).trim(),
  ]);
  expect(chunkForSpeech('a'.repeat(170))).toEqual(['a'.repeat(160), 'a'.repeat(10)]);
  expect(chunkForSpeech('no punctuation')).toEqual(['no punctuation']);
  expect(chunkForSpeech('  ')).toEqual([]);
});
test('TC-053 UT-19 FR-06 waits for voices, filters and sorts English, selects remembered/default/fallback voices', async () => {
  const { synth, events } = fakeSynth();
  const promise = loadVoices(synth);
  const us = voice('B', 'en-US');
  const gb = voice('A', 'en_GB', true, true);
  const online = voice('Remote', 'en-US', false);
  vi.mocked(synth.getVoices).mockReturnValue([
    online,
    voice('French', 'fr-FR'),
    gb,
    us,
    voice('A', 'en-US'),
  ]);
  events.dispatchEvent(new Event('voiceschanged'));
  const voices = await promise;
  expect(voices.map((v) => v.name)).toEqual(['A', 'B', 'A', 'Remote']);
  expect(pickVoice(voices, 'B')).toEqual({ voice: us, fellBack: false });
  expect(pickVoice(voices, 'missing')).toEqual({ voice: gb, fellBack: true });
  expect(pickVoice(voices, null)).toEqual({ voice: gb, fellBack: false });
  expect(pickVoice([us], null).voice).toBe(us);
  expect(pickVoice([], null)).toEqual({ voice: null, fellBack: false });
  expect(vi.getTimerCount()).toBe(0);
  expect(await loadVoices(synth)).toEqual(voices);
});
test('TC-053 UT-19 FR-06 handles voices that never load or arrive without an event', async () => {
  const { synth } = fakeSynth();
  const empty = loadVoices(synth);
  await vi.advanceTimersByTimeAsync(SPEECH.VOICES_WAIT_MS);
  expect(await empty).toEqual([]);
  const delayed = loadVoices(synth);
  vi.mocked(synth.getVoices).mockReturnValue([voice('Local', 'en-US')]);
  await vi.advanceTimersByTimeAsync(SPEECH.VOICES_WAIT_MS);
  expect(await delayed).toHaveLength(1);
});
test('TC-054 UT-19 FR-09 primes synchronously and sequences property-based utterance handlers', async () => {
  const { synth, spoken } = fakeSynth();
  primeSynthesis(synth);
  expect(spoken[0]?.text).toBe(' ');
  expect(spoken[0]?.volume).toBe(0);
  const onChunk = vi.fn();
  const chosen = voice('Local', 'en-GB');
  const result = speak(synth, ['One.', 'Two.'], {
    voice: chosen,
    rate: 1.2,
    onChunk,
    signal: new AbortController().signal,
  });
  expect(synth.cancel).toHaveBeenCalledOnce();
  expect(synth.resume).toHaveBeenCalledOnce();
  expect(spoken[1]).toMatchObject({
    text: 'One.',
    voice: chosen,
    lang: 'en-GB',
    rate: 1.2,
    pitch: 1,
    volume: 1,
  });
  spoken[1]?.onstart?.();
  expect(onChunk).toHaveBeenCalledWith(0);
  spoken[1]?.onend?.();
  await Promise.resolve();
  spoken[2]?.onstart?.();
  expect(onChunk).toHaveBeenLastCalledWith(1);
  spoken[2]?.onend?.();
  expect(await result).toBe('ended');
  expect(vi.getTimerCount()).toBe(0);
});
test.each(['interrupted', 'canceled', 'synthesis-failed'])(
  'TC-054 UT-19 FR-09 maps %s errors',
  async (error) => {
    const { synth, spoken } = fakeSynth();
    const result = speak(synth, ['Question'], {
      voice: null,
      rate: 1,
      onChunk: vi.fn(),
      signal: new AbortController().signal,
    });
    expect(spoken[0]?.lang).toBe(SPEECH.LANG);
    spoken[0]?.onerror?.({ error });
    expect(await result).toBe(error === 'synthesis-failed' ? 'error' : 'cancelled');
  },
);
test('TC-054 UT-19 FR-09 handles abort, pre-abort, a queued cancel delay, safety timeout and thrown speak', async () => {
  const { synth, spoken } = fakeSynth();
  const controller = new AbortController();
  const result = speak(synth, ['Question'], {
    voice: null,
    rate: 1,
    onChunk: vi.fn(),
    signal: controller.signal,
  });
  controller.abort();
  expect(await result).toBe('cancelled');
  expect(synth.cancel).toHaveBeenCalledTimes(2);
  expect(
    await speak(synth, ['Question'], {
      voice: null,
      rate: 1,
      onChunk: vi.fn(),
      signal: controller.signal,
    }),
  ).toBe('cancelled');
  Object.assign(synth, { pending: true });
  const safety = speak(synth, ['Short'], {
    voice: null,
    rate: 1,
    onChunk: vi.fn(),
    signal: new AbortController().signal,
  });
  expect(spoken).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(50);
  expect(spoken).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(4000);
  expect(await safety).toBe('ended');
  Object.assign(synth, { pending: false });
  vi.mocked(synth.speak).mockImplementation(() => {
    throw new Error('engine');
  });
  expect(
    await speak(synth, ['Question'], {
      voice: null,
      rate: 1,
      onChunk: vi.fn(),
      signal: new AbortController().signal,
    }),
  ).toBe('error');
});
