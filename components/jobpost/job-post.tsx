'use client';
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
import { jobFeedbackType } from '@/lib/storage/jobpost-schema';
export function JobPost({ initial }: { initial: JobResponse }) {
  const router = useRouter();
  const repository = useRepository();
  const capabilities = useCapabilities();
  const [data, setData] = useState(initial);
  const [text, setText] = useState(initial.post.text);
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
    setBusy('Saving text…');
    setError(null);
    const result = await requestJob({ operation: 'updateText', id: post.id, text });
    if (result.ok) {
      setData(result.data);
      setEditing(false);
      setSelected([]);
      if (result.data.post.id !== post.id) router.replace(`/job/${result.data.post.id}`);
    } else setError(result.message);
    setBusy(null);
  }
  async function generate(operation: 'generate' | 'more' = 'generate') {
    if (busy) return;
    setBusy(
      operation === 'more' ? 'Generating five more questions…' : 'Generating grounded questions…',
    );
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
    } else setError(result.message);
    setBusy(null);
  }
  async function start() {
    if (busy || !SESSION.LENGTHS.some((length) => length === selected.length)) return;
    setBusy('Starting your interview…');
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
        setError('Couldn’t save the session. Check your connection and try again.');
      }
    } else setError('Couldn’t start the session. Check your selection and try again.');
    setBusy(null);
  }
  return (
    <div className="job-layout">
      <aside className="space-y-5" aria-labelledby="job-read-heading">
        <p className="eyebrow">What we read</p>
        <h1 id="job-read-heading">
          <SafeText text={post.role || 'Review the job post'} />
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
          <section>
            <h2>What they’re looking for</h2>
            <ul>
              {post.requirements.map((item, index) => (
                <li key={index}>
                  <SafeText text={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {editing ? (
          <div className="space-y-3">
            <label htmlFor="read-job-text">Edit what we read</label>
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
              Save text
            </Button>
            <Button
              variant="text"
              disabled={Boolean(busy)}
              onClick={() => {
                setText(post.text);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <details open={!hasQuestions}>
              <summary>Job post text</summary>
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
              Something wrong? Edit what we read
            </Button>
          </>
        )}
      </aside>
      <section className="space-y-5" aria-labelledby="job-questions-heading">
        <h2 id="job-questions-heading">Questions they’re likely to ask</h2>
        <p>Each one points to the line in the post it comes from. Untick any you don’t want.</p>
        {!hasQuestions && (
          <>
            <p>Check the text on the left, then generate eight questions grounded in this post.</p>
            <Button
              disabled={Boolean(busy) || editing}
              onClick={() => {
                void generate();
              }}
            >
              Generate questions
            </Button>
          </>
        )}
        {questions.length > 0 && (
          <>
            <p className="mono">
              {selected.length} of {questions.filter((q) => q.origin === 'generated').length}{' '}
              selected
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
                    {question.origin === 'import' ? 'Imported · read-only' : 'Generated'} ·{' '}
                    {question.type}
                  </span>
                  <p id={`${question.id}-quote`}>
                    From the post: “<SafeText text={question.groundingQuote} />”
                  </p>
                  <details>
                    <summary>What to cover</summary>
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
                Generate 5 more
              </Button>
            )}
            <fieldset className="flex flex-wrap gap-4">
              <legend>Answer mode</legend>
              <label>
                <input
                  type="radio"
                  name="job-mode"
                  checked={mode === 'text'}
                  onChange={() => {
                    setMode('text');
                  }}
                />{' '}
                Text: type your answers
              </label>
              <label>
                <input
                  type="radio"
                  name="job-mode"
                  checked={mode === 'voice'}
                  disabled={!capabilities?.recognition}
                  onChange={() => {
                    setMode('voice');
                  }}
                />{' '}
                Voice: speak your answers
              </label>
            </fieldset>
            <p>Select 3 or 5 questions to start.</p>
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
              Start with {selected.length} questions
            </Button>
          </>
        )}
        <p role="status">{busy ?? ''}</p>
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}
