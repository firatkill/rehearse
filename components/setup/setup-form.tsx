'use client';
import { APP_EDITION } from '@/lib/edition';
import { DemoJobEntry } from './demo-job-entry';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  ROLES,
  SENIORITIES,
  QUESTION_TYPES,
  SESSION,
  SETUP_DEFAULTS,
  type QuestionType,
} from '@/lib/config';
import { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS } from '@/lib/labels';
import { startSession } from '@/lib/api/client';
import { SetupSchema, type Setup } from '@/lib/storage/schema';
import { newSessionRecord } from '@/lib/storage/new-session';
import { DIMENSION_LABELS } from '@/lib/labels';
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
const descriptions: Record<QuestionType, string> = {
  behavioral: 'Stories about your work: conflict, deadlines, mistakes, ownership.',
  'technical-concepts': 'Explain an idea, its trade-offs, and when you would use it.',
  'system-design-lite': 'Sketch a small system: requirements, parts, data flow, trade-offs.',
};

export function SetupForm({
  demoMode,
  sessionsPerDay,
  initialSeed,
  demoJob,
}: {
  demoMode: 'on' | 'readonly';
  sessionsPerDay: number;
  initialSeed: string | null;
  demoJob?: string;
}) {
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
  const voiceState = useVoices();
  const selected = changed ?? preferences;
  const setup: Setup = {
    ...selected,
    mode: capabilities && !capabilities.recognition ? 'text' : selected.mode,
    readAloud:
      (capabilities && !capabilities.synthesis) ||
      (!voiceState.loading && voiceState.voices.length === 0)
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
          `Couldn’t start the session. Check your connection and try again.${result.kind === 'http' ? ` (Reference ${result.error.requestId.slice(0, 8)})` : ''}`,
        );
      return;
    }
    const data = result.data;
    const now = new Date().toISOString();
    try {
      await repository.createSession(newSessionRecord(data, sessionSetup, now, reason));
      router.push(`/session/${data.sessionId}`);
    } catch {
      setError('Couldn’t start the session. Check your connection and try again.');
      setPending(false);
    }
  }
  return (
    <>
      {setup.dimension && (
        <p className="banner">
          Practising {DIMENSION_LABELS[setup.dimension]} · 3 questions. Changing the role, level,
          types or length returns to all dimensions.
        </p>
      )}
      <section className="setup-warmup" aria-labelledby="warmup-heading">
        <div>
          <h2 id="warmup-heading">Quick warm-up</h2>
          <p>
            {SESSION.LENGTHS[0]} questions with your last settings: {ROLE_LABELS[setup.role]} ·{' '}
            {SENIORITY_LABELS[setup.seniority]} · {setup.mode === 'voice' ? 'Voice' : 'Typing'} ·
            English
          </p>
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            void submit(undefined, { ...setup, length: SESSION.LENGTHS[0] });
          }}
        >
          Start in one click
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
        {demoJob && (
          <p>
            Selected example job: <SafeText text={demoJob} />
          </p>
        )}
        <div className="setup-paths">
          <section className="setup-card setup-job" id="job-post" aria-labelledby="job-heading">
            <Eyebrow>Got an interview?</Eyebrow>
            <h2 id="job-heading">Practise for a job post</h2>
            <p>
              Paste the link or the text of the post. Rehearse will build questions from what the
              role asks for.
            </p>
            {APP_EDITION === 'demo' ? (
              <DemoJobEntry />
            ) : (
              <>
                {' '}
                <label htmlFor="job-post-input">Job post link or text</label>
                <textarea
                  id="job-post-input"
                  rows={3}
                  disabled
                  placeholder="https://… or paste the description"
                  aria-describedby="job-coming"
                />
                <p id="job-coming">
                  Coming next: interviews based on your own job posts. Use role-based practice below
                  today.
                </p>
                <Button type="button" disabled aria-describedby="job-coming">
                  Read the job post
                </Button>
              </>
            )}
          </section>
          <section className="setup-card setup-role" aria-labelledby="role-heading">
            <Eyebrow>General practice</Eyebrow>
            <h2 id="role-heading">Practise by role</h2>
            <fieldset className="setup-fieldset">
              <legend>Role</legend>
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
              <legend>Seniority</legend>
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
              <legend>Question types</legend>
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
                  Choose at least one question type.
                </p>
              )}
            </fieldset>
          </section>
        </div>
        <section className="setup-options" aria-label="Session options">
          <fieldset className="setup-fieldset">
            <legend>Length</legend>
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
                {length === 3 ? '3 questions (about 10 minutes)' : '5 questions (about 20 minutes)'}
              </label>
            ))}
          </fieldset>
          <fieldset className="setup-fieldset">
            <legend>Answer by</legend>
            {(['voice', 'text'] as const).map((mode) => (
              <label key={mode} className="setup-choice">
                <input
                  type="radio"
                  name="mode"
                  aria-label={
                    mode === 'voice' ? 'Voice: answer out loud' : 'Text: type your answers'
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
                <span aria-hidden="true">{mode === 'voice' ? 'Voice' : 'Typing'}</span>
                <span className="sr-only">
                  {mode === 'voice' ? 'Voice: answer out loud' : 'Text: type your answers'}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
        {capabilities !== null && !capabilities.recognition && (
          <p id="voice-unavailable">Not available in this browser.</p>
        )}
        {capabilities?.synthesis && (
          <details className="setup-interviewer" open>
            <summary>Interviewer voice and speed</summary>
            <VoicePicker setup={selected} {...voiceState} onChange={change} />
          </details>
        )}
        {setup.mode === 'voice' && <MicCheck />}
        <p>
          {APP_EDITION === 'demo'
            ? 'Feedback is pre-written sample data. No AI is called.'
            : 'No daily IP quotas. Monthly budget warnings never block practice.'}
        </p>
        {initialSeed !== null && (
          <p>
            {validSeed ? (
              <SafeText
                text={`Using seed ${initialSeed}. You’ll get the same questions as the session that used it.`}
              />
            ) : (
              'That seed isn’t valid, so a new one will be used.'
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
          <Button className="min-h-11" type="submit" disabled={pending}>
            {pending
              ? 'Starting…'
              : demoMode === 'readonly'
                ? 'Start session without feedback'
                : 'Start session'}
          </Button>
        )}
      </form>
    </>
  );
}
