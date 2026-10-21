'use client';
import { TTS } from '@/lib/config';
import type { Setup } from '@/lib/storage/schema';
import { pickVoice } from '@/lib/speech/voices';
import { primeSynthesis } from '@/lib/speech/tts';
import { chunkForSpeech } from '@/lib/speech/chunk';
import { useTTS } from '@/hooks/use-tts';
import { Button } from '@/components/ui/button';
export function VoicePicker({
  setup,
  voices,
  loading,
  onChange,
}: {
  setup: Setup;
  voices: SpeechSynthesisVoice[];
  loading: boolean;
  onChange: (patch: Partial<Setup>) => void;
}) {
  const { voice, fellBack } = pickVoice(voices, setup.voiceURI);
  const empty = !loading && voices.length === 0;
  const tts = useTTS();
  return (
    <fieldset className="space-y-3">
      <legend>Interviewer voice</legend>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={!empty && setup.readAloud}
          disabled={empty}
          onChange={(event) => {
            onChange({ readAloud: event.target.checked });
          }}
        />
        Read questions aloud
      </label>
      <div>
        <label className="block" htmlFor="interviewer-voice">
          Voice
        </label>
        <select
          id="interviewer-voice"
          className="min-h-11 w-full border p-2"
          value={voice?.voiceURI ?? ''}
          disabled={loading || empty}
          onChange={(event) => {
            onChange({ voiceURI: event.target.value });
          }}
        >
          {loading ? (
            <option value="" disabled>
              Loading voices…
            </option>
          ) : empty ? (
            <option value="">No English voices found</option>
          ) : (
            voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang}){v.localService ? '' : ' (online voice)'}
              </option>
            ))
          )}
        </select>
      </div>
      {!loading && fellBack && (
        <p>Your saved voice isn’t available here, so the default voice is used.</p>
      )}
      <label className="block">
        Speaking rate
        <input
          className="block min-h-11 w-full"
          type="range"
          min={TTS.RATE_MIN}
          max={TTS.RATE_MAX}
          step={TTS.RATE_STEP}
          value={setup.rate}
          onChange={(event) => {
            onChange({ rate: Number(event.target.value) });
          }}
        />
      </label>
      <p className="font-mono">{setup.rate.toFixed(1)}×</p>
      <Button
        type="button"
        disabled={loading || empty}
        onClick={() => {
          if (tts.speaking) {
            void tts.cancel();
            return;
          }
          primeSynthesis(window.speechSynthesis);
          void tts.play(
            window.speechSynthesis,
            chunkForSpeech(TTS.PREVIEW_TEXT),
            voice,
            setup.rate,
          );
        }}
      >
        {tts.speaking ? 'Stop preview' : 'Preview voice'}
      </Button>
    </fieldset>
  );
}
