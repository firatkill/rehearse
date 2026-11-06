import { SPEECH, VOICES, LANGUAGE_LOCALES, type Language } from '@/lib/config';
export async function loadVoices(
  synth: SpeechSynthesis,
  waitMs = SPEECH.VOICES_WAIT_MS,
  language: Language = 'en',
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
  return eligibleVoices(voices, language);
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  storedURI: string | null,
  language: Language = 'en',
): { voice: SpeechSynthesisVoice | null; fellBack: boolean } {
  const eligible = eligibleVoices(voices, language);
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
function isEligible(voice: SpeechSynthesisVoice, language: Language): boolean {
  return (
    (language === 'tr' ? /^tr([-_]|$)/i : /^en([-_]|$)/i).test(voice.lang) &&
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
function eligibleVoices(
  voices: SpeechSynthesisVoice[],
  language: Language = 'en',
): SpeechSynthesisVoice[] {
  return voices
    .filter((voice) => isEligible(voice, language))
    .sort(
      (a, b) =>
        quality(b) - quality(a) ||
        Number(b.default) - Number(a.default) ||
        Number(accent(b) === (language === 'tr' ? 'tr-tr' : 'en-us')) -
          Number(accent(a) === (language === 'tr' ? 'tr-tr' : 'en-us')) ||
        a.name.localeCompare(b.name, LANGUAGE_LOCALES[language]) ||
        a.voiceURI.localeCompare(b.voiceURI, LANGUAGE_LOCALES[language]),
    );
}
export function groupVoices(
  voices: SpeechSynthesisVoice[],
  language: Language = 'en',
): { accent: string; voices: SpeechSynthesisVoice[] }[] {
  const groups = new Map<string, SpeechSynthesisVoice[]>();
  for (const voice of eligibleVoices(voices, language)) {
    const key = accent(voice);
    const group = groups.get(key) ?? [];
    group.push(voice);
    groups.set(key, group);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, LANGUAGE_LOCALES[language]))
    .map(([key, entries]) => ({ accent: key, voices: entries }));
}

/** English UI names; region codes stay internal grouping keys. */
export function voiceAccentLabel(tag: string): string {
  const region = tag.split('-').find((part, index) => index > 0 && /^[a-z]{2}$/i.test(part));
  if (!region) return 'English';
  const code = region.toUpperCase();
  const name =
    code === 'GB'
      ? 'UK'
      : code === 'US'
        ? 'US'
        : new Intl.DisplayNames(['en-GB'], { type: 'region', fallback: 'none' }).of(code);
  return name ? `English (${name})` : 'English';
}
