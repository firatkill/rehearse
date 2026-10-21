'use client';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  ROLES,
  SENIORITIES,
  QUESTION_TYPES,
  SESSION,
  SETUP_DEFAULTS,
  STORAGE,
  type QuestionType,
} from '@/lib/config';
import { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS } from '@/lib/labels';
import { startSession } from '@/lib/api/client';
import { SetupSchema, SessionRecordSchema, type Setup } from '@/lib/storage/schema';
import { useRepository } from '@/hooks/use-repository';
import { Button } from '@/components/ui/button';
import { SafeText } from '@/components/common/safe-text';
import { CapabilityNotice } from './capability-notice';
import { QuotaPanel } from './quota-panel';

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
}: {
  demoMode: 'on' | 'readonly';
  sessionsPerDay: number;
  initialSeed: string | null;
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
  const setup = changed ?? preferences;
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<{
    kind: 'quota' | 'limiter_unavailable';
    resetAt?: string;
  } | null>(null);
  const firstType = useRef<HTMLInputElement>(null);
  const validSeed = initialSeed !== null && SESSION.SEED_PATTERN.test(initialSeed);
  const change = (patch: Partial<Setup>) => {
    const next = { ...setup, ...patch };
    setChanged(next);
    try {
      localStorage.setItem('rehearse-setup', JSON.stringify(next));
    } catch {
      /* Session remains available without preferences. */
    }
  };
  async function submit(reason?: 'quota' | 'limiter_unavailable') {
    if (pending) return;
    if (setup.types.length === 0) {
      setValidation(true);
      firstType.current?.focus();
      return;
    }
    setValidation(false);
    setError(null);
    setPending(true);
    const result = await startSession({
      role: setup.role,
      seniority: setup.seniority,
      types: setup.types,
      length: setup.length,
      mode: setup.mode,
      feedback: reason === undefined,
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
      await repository.createSession(
        SessionRecordSchema.parse({
          schemaVersion: STORAGE.RECORD_SCHEMA_VERSION,
          id: data.sessionId,
          origin: 'live',
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          status: 'in_progress',
          setup,
          currentMode: setup.mode,
          seed: data.seed,
          bankVersion: data.bankVersion,
          questions: data.questions,
          feedback: { ...data.feedback, reason: reason ?? data.feedback.reason },
          token: data.token,
          tokenExpiresAt: data.tokenExpiresAt,
          checkpoint: { index: 0, phase: 'intro', at: now },
          summary: null,
          summaryStatus: 'none',
        }),
      );
      router.push(`/session/${data.sessionId}`);
    } catch {
      setError('Couldn’t start the session. Check your connection and try again.');
      setPending(false);
    }
  }
  return (
    <>
      <CapabilityNotice />
      <form
        className="space-y-6 py-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset className="space-y-2">
          <legend>Role</legend>
          <div className="flex flex-wrap gap-4">
            {ROLES.map((role) => (
              <label key={role} className="flex min-h-11 items-center gap-2">
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
        <fieldset className="space-y-2">
          <legend>Seniority</legend>
          <div className="flex flex-wrap gap-4">
            {SENIORITIES.map((seniority) => (
              <label key={seniority} className="flex min-h-11 items-center gap-2">
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
        <fieldset className="space-y-3">
          <legend>Question types</legend>
          {QUESTION_TYPES.map((type, index) => (
            <div key={type}>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  ref={index === 0 ? firstType : undefined}
                  type="checkbox"
                  checked={setup.types.includes(type)}
                  aria-describedby={`description-${type}`}
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
              <p id={`description-${type}`}>{descriptions[type]}</p>
            </div>
          ))}
          {validation && <p role="alert">Choose at least one question type.</p>}
        </fieldset>
        <fieldset className="space-y-2">
          <legend>Length</legend>
          {SESSION.LENGTHS.map((length) => (
            <label key={length} className="mr-4 inline-flex min-h-11 items-center gap-2">
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
        <fieldset className="space-y-2">
          <legend>Answer mode</legend>
          {(['voice', 'text'] as const).map((mode) => (
            <label key={mode} className="mr-4 inline-flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={setup.mode === mode}
                onChange={() => {
                  change({ mode });
                }}
              />
              {mode === 'voice' ? 'Voice: answer out loud' : 'Text: type your answers'}
            </label>
          ))}
        </fieldset>
        <p>
          Each visitor can get feedback on {sessionsPerDay} sessions a day so the demo stays free to
          run.
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
              void submit(panel.kind);
            }}
            onRetry={() => {
              setPanel(null);
              void submit();
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
