'use client';
import { TTS } from '@/lib/config';
import type { Setup } from '@/lib/storage/schema';
import { groupVoices, pickVoice, voiceAccentLabel } from '@/lib/speech/voices';
import { useState } from 'react';
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
  const groups = groupVoices(voices);
  const empty = !loading && groups.length === 0;
  const tts = useTTS();
  const [previewError, setPreviewError] = useState(false);
  return (
    <fieldset className="voice-picker">
      <legend className="sr-only">Interviewer voice</legend>
      <label className="voice-toggle">
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
      <div className="voice-grid">
        <div className="voice-field">
          <label htmlFor="interviewer-voice">Voice</label>
          <span className="select-wrap">
            <select
              id="interviewer-voice"
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
                groups.map((group) => (
                  <optgroup key={group.accent} label={voiceAccentLabel(group.accent)}>
                    {group.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang}){v.localService ? '' : ' (online voice)'}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </span>
        </div>
        <div className="voice-field">
          <div className="voice-rate-label">
            <label htmlFor="speaking-rate">Speaking rate</label>
            <p className="font-mono" aria-hidden="true">
              {setup.rate.toFixed(1)}×
            </p>
          </div>
          <input
            id="speaking-rate"
            className="voice-range"
            type="range"
            min={TTS.RATE_MIN}
            max={TTS.RATE_MAX}
            step={TTS.RATE_STEP}
            value={setup.rate}
            aria-valuetext={`${setup.rate.toFixed(1)} times speed`}
            onChange={(event) => {
              onChange({ rate: Number(event.target.value) });
            }}
          />
          <div className="voice-range-scale" aria-hidden="true">
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>
      </div>
      {!loading && fellBack && (
        <p className="voice-note">
          Your saved voice isn’t available here, so the default voice is used.
        </p>
      )}
      <div className="voice-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || empty}
          onClick={() => {
            if (tts.speaking) {
              void tts.cancel();
              return;
            }
            setPreviewError(false);
            void tts
              .play(window.speechSynthesis, chunkForSpeech(TTS.PREVIEW_TEXT), voice, setup.rate)
              .then((result) => {
                setPreviewError(result === 'error');
              });
          }}
        >
          {tts.speaking ? 'Stop preview' : 'Preview voice'}
        </Button>
        {previewError && (
          <p role="status" className="voice-note">
            Your browser didn&apos;t start speaking. Try another voice, or restart the browser.
          </p>
        )}
      </div>
    </fieldset>
  );
}
