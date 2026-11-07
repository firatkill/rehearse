'use client';
import { useNumbers } from '@/lib/i18n/use-numbers';
import { T, useT } from '@/lib/i18n/context';
import { TTS } from '@/lib/config';
import type { Setup } from '@/lib/storage/schema';
import { groupVoices, pickVoice, voiceAccentLabel } from '@/lib/speech/voices';
import { useState } from 'react';
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
  const t = useT();
  const { number } = useNumbers();

  const { voice, fellBack } = pickVoice(voices, setup.voiceURI, setup.language);
  const groups = groupVoices(voices, setup.language);
  const tts = useTTS();
  const empty = !tts.provider && !loading && groups.length === 0;
  const [previewError, setPreviewError] = useState(false);
  return (
    <fieldset className="voice-picker">
      <legend className="sr-only">
        <T id="components.setup.voice.picker.1" />
      </legend>
      <label className="voice-toggle">
        <input
          type="checkbox"
          checked={!empty && setup.readAloud}
          disabled={empty}
          onChange={(event) => {
            onChange({ readAloud: event.target.checked });
          }}
        />
        <T id="components.setup.voice.picker.2" />
      </label>
      <div className="voice-grid">
        <div className="voice-field">
          <label htmlFor="interviewer-voice">
            <T id="components.setup.voice.picker.3" />
          </label>
          <span className="select-wrap">
            <select
              id="interviewer-voice"
              value={tts.provider ? '' : (voice?.voiceURI ?? '')}
              disabled={tts.provider || loading || empty}
              onChange={(event) => {
                onChange({ voiceURI: event.target.value });
              }}
            >
              {tts.provider ? (
                <option value="">{t('speech.configuredVoice')}</option>
              ) : loading ? (
                <option value="" disabled>
                  <T id="components.setup.voice.picker.4" />
                </option>
              ) : empty ? (
                <option value="">
                  {setup.language === 'tr'
                    ? t('voice.noTurkish')
                    : t('components.setup.voice.picker.5')}
                </option>
              ) : (
                groups.map((group) => (
                  <optgroup
                    key={group.accent}
                    label={
                      setup.language === 'tr'
                        ? t('voice.turkishGroup')
                        : voiceAccentLabel(group.accent)
                    }
                  >
                    {group.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang}){v.localService ? '' : t('voice.online')}
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
            <label htmlFor="speaking-rate">
              <T id="components.setup.voice.picker.6" />
            </label>
            <p className="font-mono" aria-hidden="true">
              {number(setup.rate, 1)}×
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
            aria-valuetext={t('ui.template.43', { v0: number(setup.rate, 1) })}
            onChange={(event) => {
              onChange({ rate: Number(event.target.value) });
            }}
          />
          <div className="voice-range-scale" aria-hidden="true">
            <span>
              <T id="components.setup.voice.picker.7" />
            </span>
            <span>
              <T id="components.setup.voice.picker.8" />
            </span>
          </div>
        </div>
      </div>
      {!loading && fellBack && (
        <p className="voice-note">
          <T id="components.setup.voice.picker.9" />
        </p>
      )}
      {tts.provider && (
        <p className="voice-note">
          <T id="speech.provider" />
        </p>
      )}
      {tts.fellBack && (
        <p role="status" className="voice-note">
          <T id="speech.fallback" />
        </p>
      )}
      <div className="voice-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={(!tts.provider && loading) || empty}
          onClick={() => {
            if (tts.speaking) {
              void tts.cancel();
              return;
            }
            tts.prime();
            if (tts.provider && typeof window.speechSynthesis !== 'undefined')
              primeSynthesis(window.speechSynthesis);
            setPreviewError(false);
            void tts
              .play(
                window.speechSynthesis,
                chunkForSpeech(setup.language === 'tr' ? TTS.PREVIEW_TEXT_TR : TTS.PREVIEW_TEXT),
                voice,
                setup.rate,
                setup.language,
                { input: { kind: 'preview', language: setup.language ?? 'en' } },
              )
              .then((result) => {
                setPreviewError(result === 'error');
              });
          }}
        >
          {tts.speaking ? t('ui.dynamic.135') : t('ui.dynamic.136')}
        </Button>
        {previewError && (
          <p role="status" className="voice-note">
            <T id="components.setup.voice.picker.10" />
          </p>
        )}
      </div>
    </fieldset>
  );
}
