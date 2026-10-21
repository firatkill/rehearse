import { SPEECH } from '@/lib/config';
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
  return voices
    .filter((v) => /^en([-_]|$)/i.test(v.lang))
    .sort(
      (a, b) =>
        Number(b.localService) - Number(a.localService) ||
        Number(b.lang.replace('_', '-') === 'en-US') -
          Number(a.lang.replace('_', '-') === 'en-US') ||
        a.name.localeCompare(b.name),
    );
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  storedURI: string | null,
): { voice: SpeechSynthesisVoice | null; fellBack: boolean } {
  if (storedURI) {
    const v = voices.find((x) => x.voiceURI === storedURI);
    if (v) return { voice: v, fellBack: false };
  }
  const d = voices.find((x) => x.default) ?? voices[0] ?? null;
  return { voice: d, fellBack: storedURI !== null };
}
