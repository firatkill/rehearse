'use client';
import { jobErrorMessage } from '@/lib/i18n/job-error';
import { T, useT } from '@/lib/i18n/context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JOBPOST, SESSION, SETUP_DEFAULTS, type AnswerMode } from '@/lib/config';
import { type JobResponse } from '@/lib/api/jobpost-contracts';
import { requestJob } from '@/lib/api/jobpost-client';
import { startSession } from '@/lib/api/client';
import { SetupSchema } from '@/lib/storage/schema';
import { newSessionRecord } from '@/lib/storage/new-session';
import { useRepository } from '@/hooks/use-repository';
import { useCapabilities } from '@/hooks/use-capabilities';
import { Button } from '@/components/ui/button';
import { SafeText } from '@/components/common/safe-text';
import { InterviewDateSchema, jobFeedbackType } from '@/lib/storage/jobpost-schema';
export function JobPost({ initial }: { initial: JobResponse }) {
  const t = useT();

  const router = useRouter();
  const repository = useRepository();
  const capabilities = useCapabilities();
  const [data, setData] = useState(initial);
  const [text, setText] = useState(initial.post.text);
  const [date, setDate] = useState(initial.post.interviewDate ?? '');
  const [dateNotice, setDateNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(
    initial.questions
      .filter((q) => q.origin === 'generated')
      .slice(0, SESSION.LENGTHS[1])
      .map((q) => q.id),
  );
  const [mode, setMode] = useState<AnswerMode>('text');
  const { post, questions } = data;
  const hasQuestions = questions.some((q) => q.origin === 'generated');
  async function saveText() {
    if (busy) return;
    setBusy(t('ui.dynamic.24'));
    setError(null);
    const result = await requestJob({ operation: 'updateText', id: post.id, text });
    if (result.ok) {
      setData(result.data);
      setEditing(false);
      setSelected([]);
      if (result.data.post.id !== post.id) router.replace(`/job/${result.data.post.id}`);
    } else setError(jobErrorMessage(result.message, t));
    setBusy(null);
  }
  async function generate(operation: 'generate' | 'more' = 'generate') {
    if (busy) return;
    setBusy(operation === 'more' ? t('ui.dynamic.25') : t('ui.dynamic.26'));
    setError(null);
    const result = await requestJob({ operation, id: post.id });
    if (result.ok) {
      setData(result.data);
      if (operation === 'generate')
        setSelected(
          result.data.questions
            .filter((q) => q.origin === 'generated')
            .slice(0, SESSION.LENGTHS[1])
            .map((q) => q.id),
        );
    } else setError(jobErrorMessage(result.message, t));
    setBusy(null);
  }
  async function saveDate(value: string | null) {
    if (busy) return;
    if (value !== null && !InterviewDateSchema.safeParse(value).success) {
      setError(t('ui.dynamic.27'));
      return;
    }
    setBusy(t('ui.dynamic.28'));
    setError(null);
    setDateNotice(null);
    const result = await requestJob({
      operation: 'setInterviewDate',
      id: post.id,
      interviewDate: value,
    });
    if (result.ok) {
      setData(result.data);
      setDate(result.data.post.interviewDate ?? '');
      setDateNotice(value ? t('ui.dynamic.29') : t('ui.dynamic.30'));
    } else setError(jobErrorMessage(result.message, t));
    setBusy(null);
  }
  async function start() {
    if (busy || !SESSION.LENGTHS.some((length) => length === selected.length)) return;
    setBusy(t('ui.dynamic.31'));
    setError(null);
    const setup = SetupSchema.parse({
      role: post.practiceRole,
      seniority: SETUP_DEFAULTS.seniority,
      types: [
        ...new Set(
          questions.filter((q) => selected.includes(q.id)).map((q) => jobFeedbackType(q.type)),
        ),
      ],
      length: selected.length,
      mode,
      readAloud: mode === 'voice',
      voiceURI: null,
      rate: SETUP_DEFAULTS.rate,
    });
    const result = await startSession({
      jobPostId: post.id,
      questionIds: selected,
      role: setup.role,
      seniority: setup.seniority,
      types: setup.types,
      length: setup.length,
      mode,
      feedback: true,
    });
    if (result.ok) {
      try {
        await repository.createSession(
          newSessionRecord(result.data, setup, new Date().toISOString()),
        );
        router.push(`/session/${result.data.sessionId}`);
        return;
      } catch {
        setError(t('ui.dynamic.32'));
      }
    } else setError(t('ui.dynamic.33'));
    setBusy(null);
  }
  return (
    <div className="job-layout">
      <aside className="job-aside" aria-labelledby="job-read-heading">
        <p className="ui-eyebrow job-eyebrow">
          <T id="components.jobpost.job.post.1" />
        </p>
        <h1 id="job-read-heading">
          <SafeText text={post.role || t('ui.dynamic.34')} />
        </h1>
        {post.company && (
          <p>
            <SafeText text={post.company} />
            {post.location && (
              <>
                {' '}
                · <SafeText text={post.location} />
              </>
            )}
          </p>
        )}
        {post.about && (
          <p>
            <SafeText text={post.about} />
          </p>
        )}
        {post.requirements.length > 0 && (
          <section className="job-looking">
            <h2>
              <T id="components.jobpost.job.post.2" />
            </h2>
            <ul className="job-requirements">
              {post.requirements.map((item, index) => (
                <li key={index}>
                  <SafeText text={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="job-date" aria-label={t('ui.dynamic.35')}>
          <label htmlFor="interview-date">
            <T id="components.jobpost.job.post.3" />
          </label>
          <input
            id="interview-date"
            type="date"
            value={date}
            disabled={!!busy || editing}
            aria-describedby="interview-date-help"
            onChange={(event) => {
              setDate(event.target.value);
              setDateNotice(null);
            }}
          />
          <p id="interview-date-help" className="job-help">
            <T id="components.jobpost.job.post.4" />
          </p>
          <div className="job-date-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={!!busy || editing || !date || date === post.interviewDate}
              onClick={() => {
                void saveDate(date);
              }}
            >
              <T id="components.jobpost.job.post.5" />
            </Button>
            {post.interviewDate && (
              <Button
                type="button"
                variant="text"
                disabled={!!busy || editing}
                onClick={() => {
                  void saveDate(null);
                }}
              >
                <T id="components.jobpost.job.post.6" />
              </Button>
            )}
          </div>
          {dateNotice && <p role="status">{dateNotice}</p>}
        </section>
        {editing ? (
          <div className="job-edit">
            <label htmlFor="read-job-text">
              <T id="components.jobpost.job.post.7" />
            </label>
            <textarea
              id="read-job-text"
              rows={12}
              maxLength={JOBPOST.MAX_CHARS}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
              }}
            />
            <Button
              disabled={Boolean(busy) || !text.trim()}
              onClick={() => {
                void saveText();
              }}
            >
              <T id="components.jobpost.job.post.8" />
            </Button>
            <Button
              variant="text"
              disabled={Boolean(busy)}
              onClick={() => {
                setText(post.text);
                setEditing(false);
              }}
            >
              <T id="components.jobpost.job.post.9" />
            </Button>
          </div>
        ) : (
          <>
            <details open={!hasQuestions}>
              <summary>
                <T id="components.jobpost.job.post.10" />
              </summary>
              <div className="job-source">
                <SafeText text={post.text} />
              </div>
            </details>
            <Button
              variant="text"
              disabled={Boolean(busy)}
              onClick={() => {
                setEditing(true);
              }}
            >
              <T id="components.jobpost.job.post.11" />
            </Button>
          </>
        )}
      </aside>
      <section className="job-questions" aria-labelledby="job-questions-heading">
        <h2 id="job-questions-heading">
          <T id="components.jobpost.job.post.12" />
        </h2>
        <p>
          <T id="components.jobpost.job.post.13" />
        </p>
        {!hasQuestions && (
          <>
            <p>
              <T id="components.jobpost.job.post.14" />
            </p>
            <Button
              disabled={Boolean(busy) || editing}
              onClick={() => {
                void generate();
              }}
            >
              <T id="components.jobpost.job.post.15" />
            </Button>
          </>
        )}
        {questions.length > 0 && (
          <>
            <p className="mono">
              {selected.length}
              <T id="components.jobpost.job.post.16" />
              {questions.filter((q) => q.origin === 'generated').length}{' '}
              <T id="components.jobpost.job.post.17" />
            </p>
            {questions.map((question) => (
              <div className="job-question" key={question.id}>
                <input
                  type="checkbox"
                  id={question.id}
                  checked={selected.includes(question.id)}
                  disabled={Boolean(busy) || question.origin === 'import'}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, question.id]
                        : current.filter((id) => id !== question.id),
                    );
                  }}
                  aria-describedby={`${question.id}-quote`}
                />
                <div>
                  <label htmlFor={question.id}>
                    <SafeText text={question.text} />
                  </label>
                  <span className="tag">
                    {question.origin === 'import' ? t('ui.dynamic.36') : t('ui.dynamic.37')} ·{' '}
                    {question.type}
                  </span>
                  <p id={`${question.id}-quote`}>
                    <T id="components.jobpost.job.post.18" />
                    <SafeText text={question.groundingQuote} />”
                  </p>
                  <details>
                    <summary>
                      <T id="components.jobpost.job.post.19" />
                    </summary>
                    <ul>
                      {question.listenFor.map((item, index) => (
                        <li key={index}>
                          <SafeText text={item} />
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            ))}
            {hasQuestions && (
              <Button
                variant="outline"
                disabled={
                  Boolean(busy) ||
                  editing ||
                  questions.length + JOBPOST.MORE_QUESTIONS > JOBPOST.MAX_STORED_QUESTIONS
                }
                onClick={() => {
                  void generate('more');
                }}
              >
                <T id="components.jobpost.job.post.20" />
              </Button>
            )}
            <div className="job-start">
              <fieldset className="setup-fieldset">
                <legend>
                  <T id="components.jobpost.job.post.21" />
                </legend>
                <div className="setup-choices">
                  <label className="setup-choice">
                    <input
                      type="radio"
                      name="job-mode"
                      checked={mode === 'text'}
                      onChange={() => {
                        setMode('text');
                      }}
                    />
                    <T id="components.jobpost.job.post.22" />
                  </label>
                  <label className="setup-choice">
                    <input
                      type="radio"
                      name="job-mode"
                      checked={mode === 'voice'}
                      disabled={!capabilities?.recognition}
                      onChange={() => {
                        setMode('voice');
                      }}
                    />
                    <T id="components.jobpost.job.post.23" />
                  </label>
                </div>
              </fieldset>
              <div className="job-start-row">
                <p className="job-help">
                  <T id="components.jobpost.job.post.24" />
                </p>
                <Button
                  disabled={
                    Boolean(busy) ||
                    editing ||
                    !SESSION.LENGTHS.some((length) => length === selected.length)
                  }
                  onClick={() => {
                    void start();
                  }}
                >
                  <T id="components.jobpost.job.post.25" />
                  {selected.length}
                  <T id="components.jobpost.job.post.26" />
                </Button>
              </div>
            </div>
          </>
        )}
        <p role="status">{busy ?? ''}</p>
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}
