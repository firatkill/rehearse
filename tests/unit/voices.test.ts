import { expect, it } from 'vitest';
import { groupVoices, loadVoices, pickVoice } from '@/lib/speech/voices';
import { macosVoices } from '../fixtures/macos-voices';

it('TC-128 UT-19 V-05 filters a macOS inventory and prefers premium local over novelty or online defaults', async () => {
  const synth = { getVoices: () => macosVoices } as SpeechSynthesis;
  const voices = await loadVoices(synth);
  expect(voices.map((voice) => voice.name)).toEqual([
    'Daniel (Premium)',
    'Samantha (Enhanced)',
    'Samantha',
    'Karen',
    'Google US English',
  ]);
  expect(pickVoice(macosVoices, null).voice?.name).toBe('Daniel (Premium)');
  expect(pickVoice(macosVoices, 'com.apple.speech.synthesis.voice.Bahh')).toMatchObject({
    voice: { name: 'Daniel (Premium)' },
    fellBack: true,
  });
  expect(pickVoice(macosVoices, 'Google US English')).toMatchObject({
    voice: { name: 'Google US English' },
    fellBack: false,
  });
  expect(pickVoice(macosVoices, 'missing').fellBack).toBe(true);
  expect(pickVoice([...macosVoices].reverse(), null)).toEqual(pickVoice(macosVoices, null));
});
it('TC-128 UT-19 V-05 groups normalized accents and preserves quality within each group', () => {
  const groups = groupVoices(macosVoices);
  expect(groups.map((group) => group.accent)).toEqual(['en-au', 'en-gb', 'en-us']);
  expect(groups[2]?.voices.map((voice) => voice.name)).toEqual([
    'Samantha (Enhanced)',
    'Samantha',
    'Google US English',
  ]);
});
it.each([
  'Bahh',
  'Bells',
  'Boing',
  'Bubbles',
  'Cellos',
  'Jester',
  'Superstar',
  'Trinoids',
  'Whisper',
  'Wobble',
  'Zarvox',
  'Good News',
  'Bad News',
  'İyi Haber',
  'Kötü Haber',
])('TC-128 UT-19 V-05 excludes novelty %s even when saved', (name) => {
  const voice = { name, lang: 'en-US', voiceURI: name, localService: true, default: true };
  expect(pickVoice([voice], voice.voiceURI)).toEqual({ voice: null, fellBack: true });
  expect(groupVoices([voice])).toEqual([]);
});
it('TC-128 UT-19 V-05 defaults through enhanced, preferred standard, other local and online tiers', () => {
  let voices = macosVoices.filter((voice) => !/premium/i.test(voice.voiceURI));
  expect(pickVoice(voices, null).voice?.name).toBe('Samantha (Enhanced)');
  voices = voices.filter((voice) => !/enhanced/i.test(voice.voiceURI));
  expect(pickVoice(voices, null).voice?.name).toBe('Samantha');
  voices = voices.filter((voice) => voice.name !== 'Samantha');
  expect(pickVoice(voices, null).voice?.name).toBe('Karen');
  voices = voices.filter((voice) => voice.name !== 'Karen');
  expect(pickVoice(voices, null).voice?.name).toBe('Google US English');
  expect(pickVoice([], null)).toEqual({ voice: null, fellBack: false });
});
