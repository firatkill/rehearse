'use client';
import { useProviderSpeech } from '@/lib/speech/provider-context';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { languageHref } from '@/lib/i18n/language';
import { APP_EDITION } from '@/lib/edition';
import { JobEntry } from '@/components/jobpost/job-entry';
import { DemoJobEntry } from './demo-job-entry';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  ROLES,
  LANGUAGE_FEATURES,
  SENIORITIES,
  QUESTION_TYPES,
  SESSION,
  SETUP_DEFAULTS,
  type QuestionType,
} from '@/lib/config';
import { startSession } from '@/lib/api/client';
import { SetupSchema, type Setup } from '@/lib/storage/schema';
import { newSessionRecord } from '@/lib/storage/new-session';
import { useRepository } from '@/hooks/use-repository';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Button } from '@/components/ui/button';
import { SafeText } from '@/components/common/safe-text';
import { CapabilityNotice } from './capability-notice';
import { QuotaPanel } from './quota-panel';
import { MicCheck } from './mic-check';
import { VoicePicker } from './voice-picker';
import { useVoices } from '@/hooks/use-voices';
import { useCapabilities } from '@/hooks/use-capabilities';

const defaults: Setup = { ...SETUP_DEFAULTS, types: [...SETUP_DEFAULTS.types], voiceURI: null };
function readPreferences() {
  try {
    return localStorage.getItem('rehearse-setup');
  } catch {
    return null;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener('storage', listener);
  };
}
function serverPreferences() {
  return null;
}

export function SetupForm({
  demoMode,
  sessionsPerDay,
  initialSeed,
  demoJob,
  aiReadCost = null,
}: {
  demoMode: 'on' | 'readonly';
  sessionsPerDay: number;
  initialSeed: string | null;
  demoJob?: string;
  aiReadCost?: number | null;
}) {
  const { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS, DIMENSION_LABELS } = useLabels();

  const t = useT();
  const { selectLanguage } = useI18n();

  const descriptions: Record<QuestionType, string> = {
    behavioral: t('ui.dynamic.122'),
    'technical-concepts': t('ui.dynamic.123'),
    'system-design-lite': t('ui.dynamic.124'),
  };
  const router = useRouter();
  const repository = useRepository();
  const stored = useSyncExternalStore(subscribe, readPreferences, serverPreferences);
  const preferences = useMemo(() => {
    try {
      const parsed = SetupSchema.safeParse(stored ? JSON.parse(stored) : defaults);
      return parsed.success ? parsed.data : defaults;
    } catch {
      return defaults;
    }
  }, [stored]);
  const [changed, setChanged] = useState<Setup | null>(null);
  const capabilities = useCapabilities();
  const selected = changed ?? preferences;
  const language =
    APP_EDITION === 'demo' || !LANGUAGE_FEATURES.turkishSessions ? 'en' : selected.language;
  const voiceState = useVoices(language);
  const providerSpeech = useProviderSpeech();
  const setup: Setup = {
    ...selected,
    language:
      APP_EDITION === 'demo' || !LANGUAGE_FEATURES.turkishSessions
        ? 'en'
        : (selected.language ?? 'en'),
    mode: capabilities && !capabilities.recognition ? 'text' : selected.mode,
    readAloud:
      !providerSpeech &&
      ((capabilities && !capabilities.synthesis) ||
        (!voiceState.loading && voiceState.voices.length === 0))
        ? false
        : selected.readAloud,
  };
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<{
    kind: 'quota' | 'limiter_unavailable';
    resetAt?: string;
  } | null>(null);
  const attemptedSetup = useRef<Setup | null>(null);
  const firstType = useRef<HTMLInputElement>(null);
  const validSeed = initialSeed !== null && SESSION.SEED_PATTERN.test(initialSeed);
  const change = (patch: Partial<Setup>) => {
    const next = {
      ...setup,
      ...patch,
      ...('role' in patch || 'seniority' in patch || 'types' in patch || 'length' in patch
        ? { dimension: null }
        : {}),
    };
    setChanged(next);
    if (patch.language) void selectLanguage(patch.language);
    try {
      localStorage.setItem('rehearse-setup', JSON.stringify(next));
    } catch {
      /* Session remains available without preferences. */
    }
  };
  async function submit(reason?: 'quota' | 'limiter_unavailable', sessionSetup: Setup = setup) {
    if (pending) return;
    if (sessionSetup.types.length === 0) {
      setValidation(true);
      firstType.current?.focus();
      return;
    }
    attemptedSetup.current = sessionSetup;
    setValidation(false);
    setError(null);
    setPending(true);
    const result = await startSession({
      ...(demoJob ? { demoJob } : {}),
      language: sessionSetup.language ?? 'en',
      role: sessionSetup.role,
      seniority: sessionSetup.seniority,
      types: sessionSetup.types,
      length: sessionSetup.length,
      mode: sessionSetup.mode,
      feedback: reason === undefined,
      ...(sessionSetup.dimension ? { dimension: sessionSetup.dimension } : {}),
      ...(validSeed ? { seed: initialSeed } : {}),
    });
    if (!result.ok) {
      setPending(false);
      if (result.kind === 'http' && result.error.code === 'SESSION_QUOTA_EXCEEDED')
        setPanel({
          kind: 'quota',
          ...(result.error.resetAt ? { resetAt: result.error.resetAt } : {}),
        });
      else if (result.kind === 'http' && result.error.code === 'LIMITER_UNAVAILABLE')
        setPanel({ kind: 'limiter_unavailable' });
      else
        setError(
          t('ui.template.38', {
            v0:
              result.kind === 'http'
                ? t('ui.template.39', { v0: result.error.requestId.slice(0, 8) })
                : '',
          }),
        );
      return;
    }
    const data = result.data;
    const now = new Date().toISOString();
    try {
      await repository.createSession(newSessionRecord(data, sessionSetup, now, reason));
      router.push(languageHref(`/session/${data.sessionId}`, sessionSetup.language ?? 'en'));
    } catch {
      setError(t('ui.dynamic.125'));
      setPending(false);
    }
  }
  return (
    <>
      {setup.dimension && (
        <p className="banner">
          <T id="components.setup.setup.form.1" />
          {DIMENSION_LABELS[setup.dimension]}
          <T id="components.setup.setup.form.2" />
        </p>
      )}
      <section className="setup-warmup" aria-labelledby="warmup-heading">
        <div>
          <h2 id="warmup-heading">
            <T id="components.setup.setup.form.3" />
          </h2>
          <p>
            {t('setup.warmup', {
              count: SESSION.LENGTHS[0],
              role: ROLE_LABELS[setup.role],
              seniority: SENIORITY_LABELS[setup.seniority],
              mode:
                setup.mode === 'voice' ? t('components.setup.voice.picker.3') : t('ui.dynamic.126'),
              language: t(setup.language === 'tr' ? 'language.tr' : 'language.en'),
            })}
          </p>
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            void submit(undefined, { ...setup, length: SESSION.LENGTHS[0] });
          }}
        >
          <T id="components.setup.setup.form.6" />
        </Button>
      </section>
      <CapabilityNotice capabilities={capabilities} />
      <form
        className="setup-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {(APP_EDITION === 'demo' || LANGUAGE_FEATURES.turkishSessions) && (
          <fieldset className="setup-fieldset">
            <legend>{t('language.label')}</legend>
            <label className="setup-choice">
              <input
                type="radio"
                name="language"
                value="en"
                checked={setup.language === 'en'}
                onChange={() => {
                  change({ language: 'en' });
                }}
              />
              {t('language.en')}
            </label>
            <label className="setup-choice">
              <input
                type="radio"
                name="language"
                value="tr"
                checked={setup.language === 'tr'}
                disabled={APP_EDITION === 'demo'}
                aria-describedby={APP_EDITION === 'demo' ? 'turkish-edition' : undefined}
                onChange={() => {
                  change({ language: 'tr' });
                }}
              />
              {t('language.tr')}
              {APP_EDITION === 'demo' && <> · {t('language.full')}</>}
            </label>
            {APP_EDITION === 'demo' && <p id="turkish-edition">{t('language.unavailable')}</p>}
          </fieldset>
        )}
        {demoJob && (
          <p>
            <T id="components.setup.setup.form.7" />
            <SafeText text={demoJob} />
          </p>
        )}
        <div className="setup-paths">
          <section className="setup-card setup-job" id="job-post" aria-labelledby="job-heading">
            <Eyebrow>
              <T id="components.setup.setup.form.8" />
            </Eyebrow>
            <h2 id="job-heading">
              <T id="components.setup.setup.form.9" />
            </h2>
            <p>
              <T id="components.setup.setup.form.10" />
            </p>
            {APP_EDITION === 'demo' ? <DemoJobEntry /> : <JobEntry aiReadCost={aiReadCost} />}
          </section>
          <section className="setup-card setup-role" aria-labelledby="role-heading">
            <Eyebrow>
              <T id="components.setup.setup.form.11" />
            </Eyebrow>
            <h2 id="role-heading">
              <T id="components.setup.setup.form.12" />
            </h2>
            <fieldset className="setup-fieldset">
              <legend>
                <T id="components.setup.setup.form.13" />
              </legend>
              <div className="setup-choices">
                {ROLES.map((role) => (
                  <label key={role} className="setup-choice">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={setup.role === role}
                      onChange={() => {
                        change({ role });
                      }}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="setup-fieldset">
              <legend>
                <T id="components.setup.setup.form.14" />
              </legend>
              <div className="setup-choices">
                {SENIORITIES.map((seniority) => (
                  <label key={seniority} className="setup-choice">
                    <input
                      type="radio"
                      name="seniority"
                      value={seniority}
                      checked={setup.seniority === seniority}
                      onChange={() => {
                        change({ seniority });
                      }}
                    />
                    {SENIORITY_LABELS[seniority]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="setup-fieldset setup-types">
              <legend>
                <T id="components.setup.setup.form.15" />
              </legend>
              {QUESTION_TYPES.map((type, index) => (
                <div key={type}>
                  <label className="setup-choice">
                    <input
                      ref={index === 0 ? firstType : undefined}
                      type="checkbox"
                      checked={setup.types.includes(type)}
                      aria-invalid={validation || undefined}
                      aria-describedby={`description-${type}${validation ? ' question-types-error' : ''}`}
                      onChange={() => {
                        change({
                          types: setup.types.includes(type)
                            ? setup.types.filter((t) => t !== type)
                            : [...setup.types, type],
                        });
                      }}
                    />
                    {QUESTION_TYPE_LABELS[type]}
                  </label>
                  <p className="sr-only" id={`description-${type}`}>
                    {descriptions[type]}
                  </p>
                </div>
              ))}
              {validation && (
                <p id="question-types-error" role="alert">
                  <T id="components.setup.setup.form.16" />
                </p>
              )}
            </fieldset>
          </section>
        </div>
        <section className="setup-options" aria-label={t('ui.dynamic.127')}>
          <fieldset className="setup-fieldset">
            <legend>
              <T id="components.room.delivery.metrics.2" />
            </legend>
            {SESSION.LENGTHS.map((length) => (
              <label key={length} className="setup-choice">
                <input
                  type="radio"
                  name="length"
                  checked={setup.length === length}
                  onChange={() => {
                    change({ length });
                  }}
                />
                {t(length === 3 ? 'setup.length.short' : 'setup.length.long')}
              </label>
            ))}
          </fieldset>
          <fieldset className="setup-fieldset">
            <legend>
              <T id="components.setup.setup.form.18" />
            </legend>
            {(['voice', 'text'] as const).map((mode) => (
              <label key={mode} className="setup-choice">
                <input
                  type="radio"
                  name="mode"
                  aria-label={
                    mode === 'voice' ? t('ui.dynamic.128') : t('components.jobpost.job.post.22')
                  }
                  disabled={mode === 'voice' && capabilities !== null && !capabilities.recognition}
                  aria-describedby={
                    mode === 'voice' && capabilities !== null && !capabilities.recognition
                      ? 'voice-unavailable'
                      : undefined
                  }
                  checked={setup.mode === mode}
                  onChange={() => {
                    change({ mode });
                  }}
                />
                <span aria-hidden="true">
                  {mode === 'voice' ? t('components.setup.voice.picker.3') : t('ui.dynamic.126')}
                </span>
                <span className="sr-only">
                  {mode === 'voice' ? t('ui.dynamic.128') : t('components.jobpost.job.post.22')}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
        {capabilities !== null && !capabilities.recognition && (
          <p id="voice-unavailable" className="setup-note">
            <T id="components.setup.setup.form.19" />
          </p>
        )}
        {setup.mode === 'voice' && <MicCheck />}
        {(capabilities?.synthesis || providerSpeech) && (
          <details className="setup-interviewer" open>
            <summary>
              <T id="components.setup.setup.form.20" />
            </summary>
            <VoicePicker setup={selected} {...voiceState} onChange={change} />
          </details>
        )}
        {initialSeed !== null && (
          <p className="setup-note">
            {validSeed ? (
              <SafeText text={t('ui.template.42', { v0: initialSeed })} />
            ) : (
              t('ui.dynamic.129')
            )}
          </p>
        )}
        {error && (
          <p role="alert">
            <SafeText text={error} />
          </p>
        )}
        {panel ? (
          <QuotaPanel
            {...panel}
            sessionsPerDay={sessionsPerDay}
            pending={pending}
            onPractise={() => {
              void submit(panel.kind, attemptedSetup.current ?? setup);
            }}
            onRetry={() => {
              setPanel(null);
              void submit(undefined, attemptedSetup.current ?? setup);
            }}
          />
        ) : (
          <div className="setup-submit">
            <p className="setup-note">
              {APP_EDITION === 'demo' ? t('ui.dynamic.130') : t('ui.dynamic.131')}
            </p>
            <Button className="min-h-11" type="submit" disabled={pending}>
              {pending
                ? t('ui.dynamic.132')
                : demoMode === 'readonly'
                  ? t('ui.dynamic.133')
                  : t('ui.dynamic.134')}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
