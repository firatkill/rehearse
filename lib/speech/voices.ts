import { SPEECH, VOICES } from '@/lib/config';
export async function loadVoices(
  synth: SpeechSynthesis,
  waitMs = SPEECH.VOICES_WAIT_MS,
): Promise<SpeechSynthesisVoice[]> {
  let voices = synth.getVoices();
  if (voices.length === 0) {
    voices = await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        synth.removeEventListener('voiceschanged', done);
        resolve(synth.getVoices());
      };
      const timer = setTimeout(done, waitMs);
      synth.addEventListener('voiceschanged', done);
    });
  }
  return eligibleVoices(voices);
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  storedURI: string | null,
): { voice: SpeechSynthesisVoice | null; fellBack: boolean } {
  const eligible = eligibleVoices(voices);
  if (storedURI) {
    const v = eligible.find((x) => x.voiceURI === storedURI);
    if (v) return { voice: v, fellBack: false };
  }
  const d = eligible[0] ?? null;
  return { voice: d, fellBack: storedURI !== null };
}

function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}
function isEligible(voice: SpeechSynthesisVoice): boolean {
  return (
    /^en([-_]|$)/i.test(voice.lang) &&
    !VOICES.NOVELTY_NAMES.some(
      (name) =>
        normalizedName(voice.name) === normalizedName(name) ||
        normalizedName(voice.voiceURI.split('.').at(-1) ?? '').startsWith(normalizedName(name)),
    )
  );
}
function quality(voice: SpeechSynthesisVoice): number {
  if (!voice.localService) return 0;
  if (/premium/i.test(voice.name + ' ' + voice.voiceURI)) return 4;
  if (/enhanced/i.test(voice.name + ' ' + voice.voiceURI)) return 3;
  if (VOICES.PREFERRED_NAMES.some((name) => voice.name.startsWith(name))) return 2;
  return 1;
}
function accent(voice: SpeechSynthesisVoice): string {
  return voice.lang.replaceAll('_', '-').toLowerCase();
}
function eligibleVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter(isEligible)
    .sort(
      (a, b) =>
        quality(b) - quality(a) ||
        Number(b.default) - Number(a.default) ||
        Number(accent(b) === 'en-us') - Number(accent(a) === 'en-us') ||
        a.name.localeCompare(b.name, 'en-GB') ||
        a.voiceURI.localeCompare(b.voiceURI, 'en-GB'),
    );
}
export function groupVoices(
  voices: SpeechSynthesisVoice[],
): { accent: string; voices: SpeechSynthesisVoice[] }[] {
  const groups = new Map<string, SpeechSynthesisVoice[]>();
  for (const voice of eligibleVoices(voices)) {
    const key = accent(voice);
    const group = groups.get(key) ?? [];
    group.push(voice);
    groups.set(key, group);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, 'en-GB'))
    .map(([key, entries]) => ({ accent: key, voices: entries }));
}
