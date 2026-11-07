'use client';
import { CameraPreview } from '@/components/common/camera-preview';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT, useSessionLanguage } from '@/lib/i18n/context';
import type { Feedback } from '@/lib/feedback/schema';
import { ChangeOneThing } from './change-one-thing';
import { FOLLOW_UP } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { useInterviewRoom } from '@/hooks/use-interview-room';
import { useShell } from '@/components/layout/shell';
import { LiveRegion } from '@/components/common/live-region';
import dynamic from 'next/dynamic';
const ConfirmDialog = dynamic(() =>
  import('@/components/common/confirm-dialog').then((m) => m.ConfirmDialog),
);
import { SafeText } from '@/components/common/safe-text';
import { Button } from '@/components/ui/button';
import { durationWords } from '@/lib/i18n/duration';
import { RecorderPanel } from './recorder-panel';
import { SpeechError } from './speech-error';
import { ANSWER, SESSION } from '@/lib/config';
import { ProgressHeader } from './progress-header';
import { QuestionPanel } from './question-panel';
import { ThinkTimer } from './think-timer';
import { TextAnswer } from './text-answer';
import { ReviewPanel } from './review-panel';
import { ResumeCard } from './resume-card';
const AttemptFeedback = dynamic(() => import('./attempt-feedback').then((m) => m.AttemptFeedback));
import { FeedbackSkeleton } from './feedback-skeleton';
import { FeedbackError } from './feedback-error';
import { DeliveryMetrics } from './delivery-metrics';

export function Room({
  id,
  offline,
  feedbackPerDay,
  globalPerDay,
  jobLabels = {},
}: {
  id: string;
  offline: boolean;
  feedbackPerDay: number;
  globalPerDay: number;
  jobLabels?: Record<string, string>;
}) {
  const { ROLE_LABELS, SENIORITY_LABELS, ANSWER_MODE_LABELS } = useLabels();

  const t = useT();

  const {
    state,
    send,
    onDraft,
    online,
    recorder,
    activeChunk,
    speechFellBack,
    providerSpeech,
    readAloudError,
    capabilities,
    feedbackTransport,
  } = useInterviewRoom(id);
  const { announce, message, registerEnd } = useShell();
  const [retryFeedback, setRetryFeedback] = useState<Feedback | null>(null);
  const isFollowUp = Boolean(state.answers.find((a) => a.index === state.index)?.followUp);
  const root = useRef<HTMLDivElement>(null);
  const { session, phase, index } = state;
  useSessionLanguage(session?.setup.language);
  const jobLabel =
    session?.questions.map((q) => jobLabels[q.id]).find((label) => label !== undefined) ?? null;
  const kind = phase.kind;
  const feedbackOverall = state.answers.find((a) => a.index === index)?.feedback?.overall;
  const answerMode = phase.kind === 'answering' ? phase.answerMode : null;
  const limit = state.answers.find((a) => a.index === index)?.followUp
    ? FOLLOW_UP.TIME_LIMIT_S
    : (session?.questions[index]?.time_limit_s ?? 0);
  useEffect(
    () =>
      registerEnd(() => {
        send({ type: 'OPEN_DIALOG', dialog: 'end' });
      }),
    [registerEnd, send],
  );
  useEffect(() => {
    document.title =
      kind === 'intro' || kind === 'loading'
        ? t('ui.dynamic.81')
        : session
          ? t('ui.template.31', { v0: index + 1, v1: session.questions.length })
          : t('ui.dynamic.82');
    const target = root.current?.querySelector<HTMLElement>('[data-phase-focus]');
    target?.focus();
    if (target instanceof HTMLTextAreaElement)
      target.setSelectionRange(target.value.length, target.value.length);
    const status =
      kind === 'asking'
        ? isFollowUp
          ? t('ui.dynamic.83')
          : t('ui.template.32', { v0: index + 1 })
        : kind === 'thinking'
          ? t('ui.template.33', {
              v0: SESSION.THINK_SECONDS,
              v1: readAloudError ? t('room.readAloudFallback') : '',
            })
          : kind === 'answering'
            ? answerMode === 'voice'
              ? t('ui.template.34', { v0: durationWords(limit, t) })
              : t('ui.dynamic.84')
            : kind === 'review'
              ? t('ui.dynamic.85')
              : kind === 'submitting'
                ? t('ui.dynamic.70')
                : kind === 'feedback'
                  ? t('ui.template.35', { v0: feedbackOverall ?? '' })
                  : kind === 'saved'
                    ? t('ui.dynamic.86')
                    : '';
    announce(status);
  }, [
    t,
    kind,
    index,
    state.mode,
    session,
    announce,
    answerMode,
    limit,
    readAloudError,
    feedbackOverall,
    isFollowUp,
  ]);
  if (kind === 'loading')
    return (
      <p>
        <T id="components.report.report.loader.1" />
      </p>
    );
  if (!session)
    return (
      <div ref={root} className="space-y-4 py-8">
        <h1 tabIndex={-1} data-phase-focus>
          <T id="components.report.report.loader.2" />
        </h1>
        <p>
          <T id="components.report.report.loader.3" />
        </p>
        <Link href="/setup">
          <T id="components.report.report.loader.4" />
        </Link>
        <Link href="/history">
          <T id="components.report.report.loader.5" />
        </Link>
      </div>
    );
  if (offline)
    return (
      <div className="space-y-4 py-8">
        <p>
          <T id="components.room.room.6" />
        </p>
        <Link href={`/session/${id}/report`}>
          <T id="components.room.room.7" />
        </Link>
      </div>
    );
  const originalQuestion = session.questions[index];
  const answer = state.answers.find((a) => a.index === index);
  const retryGuidance = retryFeedback ?? answer?.attemptRecords.at(-1)?.feedback;
  const question =
    originalQuestion && answer?.followUp
      ? {
          ...originalQuestion,
          prompt: answer.followUp.prompt,
          time_limit_s: FOLLOW_UP.TIME_LIMIT_S,
        }
      : originalQuestion;
  const answered = state.answers.filter(
    (a) => a.status === 'saved' || a.status === 'scored' || a.attemptRecords.length > 0,
  ).length;
  const dialog = state.dialog;
  const start = () => {
    send({ type: 'START_INTERVIEW' });
  };
  return (
    <div ref={root} className="room-stage" data-phase={kind}>
      <ProgressHeader session={session} index={index} jobLabel={jobLabel} />
      <CameraPreview ended={kind === 'done'} />
      {providerSpeech && kind === 'intro' && (
        <p>
          <T id="speech.provider" />
        </p>
      )}
      {speechFellBack && (
        <p role="status">
          <T id="speech.fallback" />
        </p>
      )}
      {answer?.followUp && (
        <p>
          <T id="components.room.room.8" />
        </p>
      )}
      <LiveRegion visible message={message} />
      {kind === 'intro' ? (
        state.restoredNotice ? (
          <ResumeCard index={index} total={session.questions.length} onContinue={start} />
        ) : (
          <section className="room-intro">
            <h1>
              <T id="components.room.room.9" />
            </h1>
            <p>
              {session.questions.length}
              <T id="components.room.room.10" />{' '}
              <SafeText
                text={
                  jobLabel ??
                  `${ROLE_LABELS[session.setup.role]}, ${SENIORITY_LABELS[session.setup.seniority]}`
                }
              />{' '}
              · {ANSWER_MODE_LABELS[state.mode]}
              <T id="components.room.room.11" />
            </p>
            {state.mode === 'voice' && (
              <p>
                <T id="components.room.room.12" />{' '}
                <Link href="/privacy">
                  <T id="components.room.room.13" />
                </Link>
                .
              </p>
            )}
            {!session.feedback.enabled && (
              <p>
                <T id="components.room.room.14" />
              </p>
            )}
            <Button variant="on-dark" data-phase-focus className="min-h-11" onClick={start}>
              <T id="components.room.room.15" />
            </Button>
          </section>
        )
      ) : (
        question && <QuestionPanel prompt={question.prompt} activeChunk={activeChunk} />
      )}
      {phase.kind === 'asking' && (
        <div className="room-actions">
          <Button
            variant="on-dark"
            data-phase-focus
            onClick={() => {
              send({ type: 'START_ANSWERING', now: Date.now() });
            }}
          >
            <T id="components.room.room.16" />
          </Button>
          {!phase.interrupted && (
            <Button
              variant="text"
              onClick={() => {
                send({ type: 'STOP_READING' });
              }}
            >
              <T id="components.room.room.17" />
            </Button>
          )}
          {capabilities?.synthesis && (
            <Button
              variant="text"
              onClick={() => {
                send({ type: 'REPLAY' });
              }}
            >
              <T id="components.room.room.18" />
            </Button>
          )}
        </div>
      )}
      {capabilities?.synthesis && phase.kind === 'thinking' && (
        <Button
          variant="text"
          onClick={() => {
            send({ type: 'REPLAY' });
          }}
        >
          <T id="components.room.room.18" />
        </Button>
      )}
      {answer &&
        answer.attemptRecords.length > 0 &&
        !answer.followUp &&
        retryGuidance &&
        ['answering', 'review'].includes(kind) && <ChangeOneThing feedback={retryGuidance} />}
      {phase.kind === 'answering' && phase.answerMode === 'voice' && question && (
        <RecorderPanel
          followUp={answer?.followUp !== null && answer?.followUp !== undefined}
          transcript={recorder.ctx.transcript}
          startedAt={phase.startedAt}
          limit={question.time_limit_s}
          announce={announce}
          onStop={() => {
            recorder.stop('user');
          }}
          onLimit={() => {
            recorder.stop('time_limit');
          }}
        />
      )}
      {phase.kind === 'speech-error' && (
        <SpeechError
          error={phase.error}
          onType={() => {
            send({ type: 'TYPE_INSTEAD' });
          }}
          onRetry={() => {
            send({ type: 'RETRY_RECORDING', now: Date.now() });
          }}
        />
      )}
      {phase.kind === 'thinking' && (
        <ThinkTimer
          remainingMs={phase.remainingMs}
          wasPaused={phase.wasPaused}
          mode={state.mode}
          onStart={() => {
            send({ type: 'START_ANSWERING', now: Date.now() });
          }}
        />
      )}
      {phase.kind === 'answering' && phase.answerMode === 'text' && question && (
        <TextAnswer
          key={index}
          initial={answer?.transcript ?? ''}
          startedAt={phase.startedAt}
          limit={question.time_limit_s}
          onDraft={onDraft}
          onReview={(transcript) => {
            send({ type: 'TEXT_REVIEW', transcript });
          }}
        />
      )}
      {kind === 'review' && answer && question && (
        <ReviewPanel
          answer={answer}
          feedbackEnabled={session.feedback.enabled}
          online={online}
          limit={question.time_limit_s}
          onEdit={(transcript) => {
            send({ type: 'EDIT', transcript });
          }}
          onSubmit={() => {
            send({ type: 'SUBMIT', now: Date.now() });
          }}
          onSave={() => {
            send({ type: 'SAVE_WITHOUT_FEEDBACK' });
          }}
          onRecordAgain={() => {
            send({ type: 'OPEN_DIALOG', dialog: 'record-again' });
          }}
        />
      )}
      {kind === 'submitting' && answer && (
        <>
          <label htmlFor="submitted-answer">
            <T id="components.room.answer.editor.1" />
          </label>
          <textarea
            id="submitted-answer"
            className="border-input w-full border p-3"
            value={answer.transcript}
            readOnly
            rows={ANSWER.TEXTAREA_MIN_ROWS}
          />
          <FeedbackSkeleton />
        </>
      )}
      {kind === 'feedback' && answer && question && (
        <>
          <AttemptFeedback
            key={`${answer.attemptRecords.length}:${answer.followUpRecords.length}`}
            answer={answer}
            question={originalQuestion ?? question}
            onFollowUp={(parentAttemptId) => {
              send({ type: 'FOLLOW_UP', parentAttemptId });
            }}
            onRetry={(feedback) => {
              setRetryFeedback(feedback);
              send({ type: 'RETRY_ANSWER' });
            }}
          />
          <div className="room-actions room-next">
            <Button
              variant="secondary"
              onClick={() => {
                send({ type: 'NEXT' });
              }}
            >
              {index + 1 === session.questions.length ? t('ui.dynamic.87') : t('ui.dynamic.88')}
            </Button>
          </div>
        </>
      )}
      {phase.kind === 'feedback-error' && (
        <FeedbackError
          code={phase.code}
          requestId={phase.requestId}
          retries={Math.max(
            0,
            (phase.sessionCallsRemaining ?? 0) -
              session.questions
                .slice(index)
                .filter(
                  (_, offset) =>
                    !state.answers.some(
                      (a) =>
                        a.index === index + offset &&
                        ['scored', 'saved', 'skipped'].includes(a.status),
                    ),
                ).length,
          )}
          network={feedbackTransport.network}
          resetAt={feedbackTransport.resetAt}
          feedbackPerDay={feedbackPerDay}
          globalPerDay={globalPerDay}
          online={online}
          onRetry={() => {
            send({ type: 'SUBMIT', now: Date.now() });
          }}
          onSave={() => {
            send({ type: 'SAVE_WITHOUT_FEEDBACK' });
          }}
        />
      )}
      {kind === 'saved' && answer && question && (
        <section className="space-y-4">
          <DeliveryMetrics metrics={answer.metrics} mode={answer.mode} />
          <h2>
            <T id="components.room.feedback.card.16" />
          </h2>
          <ul>
            {question.what_good_looks_like.map((text) => (
              <li key={text}>
                <SafeText text={text} />
              </li>
            ))}
          </ul>
          <Button
            data-phase-focus
            className="min-h-11"
            onClick={() => {
              send({ type: 'NEXT' });
            }}
          >
            {index + 1 === session.questions.length ? t('ui.dynamic.87') : t('ui.dynamic.88')}
          </Button>
        </section>
      )}
      <div className="room-secondary-actions">
        {state.mode === 'voice' && ['asking', 'thinking', 'answering'].includes(kind) && (
          <Button
            className="min-h-11"
            variant="text"
            onClick={() => {
              send({ type: 'TYPE_INSTEAD' });
            }}
          >
            <T id="components.room.room.22" />
          </Button>
        )}
        {['asking', 'thinking', 'answering', 'speech-error', 'review'].includes(kind) && (
          <Button
            variant="text"
            className="min-h-11"
            onClick={() => {
              send({ type: 'OPEN_DIALOG', dialog: 'skip' });
            }}
          >
            <T id="components.room.room.23" />
          </Button>
        )}
      </div>
      {dialog !== null && (
        <ConfirmDialog
          open
          title={
            dialog === 'end'
              ? t('ui.dynamic.89')
              : dialog === 'skip'
                ? t('ui.dynamic.90')
                : t('ui.dynamic.91')
          }
          description={
            dialog === 'end'
              ? answered
                ? t('ui.template.36', { v0: answered })
                : t('ui.dynamic.92')
              : dialog === 'skip'
                ? t('ui.dynamic.93')
                : t('ui.dynamic.94')
          }
          confirm={
            dialog === 'end'
              ? t('components.layout.shell.2')
              : dialog === 'skip'
                ? t('components.room.room.23')
                : t('components.room.review.panel.7')
          }
          cancel={
            dialog === 'end'
              ? t('ui.dynamic.95')
              : dialog === 'skip'
                ? t('ui.dynamic.96')
                : t('ui.dynamic.97')
          }
          onCancel={() => {
            send({ type: 'CLOSE_DIALOG' });
          }}
          onConfirm={() => {
            send(
              dialog === 'end'
                ? { type: 'CONFIRM_END' }
                : dialog === 'skip'
                  ? { type: 'CONFIRM_SKIP' }
                  : { type: 'CONFIRM_RECORD_AGAIN', now: Date.now() },
            );
          }}
        />
      )}
    </div>
  );
}
