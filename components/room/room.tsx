'use client';
import type { Feedback } from '@/lib/feedback/schema';
import { ChangeOneThing } from './change-one-thing';
import { FOLLOW_UP } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useInterviewRoom } from '@/hooks/use-interview-room';
import { useShell } from '@/components/layout/shell';
import { LiveRegion } from '@/components/common/live-region';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SafeText } from '@/components/common/safe-text';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS, SENIORITY_LABELS, ANSWER_MODE_LABELS } from '@/lib/labels';
import { formatDurationWords } from '@/lib/time';
import { RecorderPanel } from './recorder-panel';
import { SpeechError } from './speech-error';
import { ANSWER, SESSION } from '@/lib/config';
import { ProgressHeader } from './progress-header';
import { QuestionPanel } from './question-panel';
import { ThinkTimer } from './think-timer';
import { TextAnswer } from './text-answer';
import { ReviewPanel } from './review-panel';
import { ResumeCard } from './resume-card';
import { AttemptFeedback } from './attempt-feedback';
import { FeedbackSkeleton } from './feedback-skeleton';
import { FeedbackError } from './feedback-error';
import { DeliveryMetrics } from './delivery-metrics';

export function Room({
  id,
  offline,
  feedbackPerDay,
  globalPerDay,
}: {
  id: string;
  offline: boolean;
  feedbackPerDay: number;
  globalPerDay: number;
}) {
  const {
    state,
    send,
    onDraft,
    online,
    recorder,
    activeChunk,
    readAloudError,
    capabilities,
    feedbackTransport,
  } = useInterviewRoom(id);
  const { announce, message, registerEnd } = useShell();
  const [retryFeedback, setRetryFeedback] = useState<Feedback | null>(null);
  const isFollowUp = Boolean(state.answers.find((a) => a.index === state.index)?.followUp);
  const root = useRef<HTMLDivElement>(null);
  const { session, phase, index } = state;
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
        ? 'Interview · Rehearse'
        : session
          ? `Question ${index + 1} of ${session.questions.length} · Rehearse`
          : 'Session not found · Rehearse';
    const target = root.current?.querySelector<HTMLElement>('[data-phase-focus]');
    target?.focus();
    if (target instanceof HTMLTextAreaElement)
      target.setSelectionRange(target.value.length, target.value.length);
    const status =
      kind === 'asking'
        ? isFollowUp
          ? 'The interviewer is reading the follow-up.'
          : `The interviewer is reading question ${index + 1}.`
        : kind === 'thinking'
          ? `${SESSION.THINK_SECONDS} seconds to think.${readAloudError ? ' Read-aloud didn’t work, so the question is shown as text.' : ''}`
          : kind === 'answering'
            ? answerMode === 'voice'
              ? `Recording. ${formatDurationWords(limit)} to answer.`
              : 'Answer box open.'
            : kind === 'review'
              ? 'Review your answer.'
              : kind === 'submitting'
                ? 'Reading your answer…'
                : kind === 'feedback'
                  ? `Feedback ready. Overall ${feedbackOverall ?? ''} out of 4.`
                  : kind === 'saved'
                    ? 'Answer saved.'
                    : '';
    announce(status);
  }, [
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
  if (kind === 'loading') return <p>Loading your session…</p>;
  if (!session)
    return (
      <div ref={root} className="space-y-4 py-8">
        <h1 tabIndex={-1} data-phase-focus>
          Session not found
        </h1>
        <p>
          This session isn’t saved in this browser. Sessions live only in the browser where they
          were created.
        </p>
        <Link href="/setup">Start a new session</Link>
        <Link href="/history">Open history</Link>
      </div>
    );
  if (offline)
    return (
      <div className="space-y-4 py-8">
        <p>
          The practice room is offline, so this session can’t continue right now. You can open what
          you’ve answered so far.
        </p>
        <Link href={`/session/${id}/report`}>Open report</Link>
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
      <ProgressHeader session={session} index={index} />
      {answer?.followUp && <p>Follow-up</p>}
      <LiveRegion visible message={message} />
      {kind === 'intro' ? (
        state.restoredNotice ? (
          <ResumeCard index={index} total={session.questions.length} onContinue={start} />
        ) : (
          <section className="room-intro space-y-4">
            <h1>Ready when you are</h1>
            <p>
              {session.questions.length} questions · {ROLE_LABELS[session.setup.role]},{' '}
              {SENIORITY_LABELS[session.setup.seniority]} · {ANSWER_MODE_LABELS[state.mode]} answers
            </p>
            {state.mode === 'voice' && (
              <p>
                When you start, your browser will ask to use the microphone. Speech is transcribed
                by your browser’s speech service; read how on the{' '}
                <Link href="/privacy">privacy page</Link>.
              </p>
            )}
            {!session.feedback.enabled && (
              <p>
                Feedback is off for this session. You’ll see your transcript and delivery numbers.
              </p>
            )}
            <Button variant="on-dark" data-phase-focus className="min-h-11" onClick={start}>
              Start the interview
            </Button>
          </section>
        )
      ) : (
        question && <QuestionPanel prompt={question.prompt} activeChunk={activeChunk} />
      )}
      {phase.kind === 'asking' && (
        <div className="flex flex-wrap gap-3">
          {!phase.interrupted && (
            <Button
              variant="text"
              onClick={() => {
                send({ type: 'STOP_READING' });
              }}
            >
              Stop reading
            </Button>
          )}
          <Button
            variant="on-dark"
            data-phase-focus
            onClick={() => {
              send({ type: 'START_ANSWERING', now: Date.now() });
            }}
          >
            I’m ready to answer
          </Button>
        </div>
      )}
      {capabilities?.synthesis && (phase.kind === 'asking' || phase.kind === 'thinking') && (
        <Button
          variant="text"
          onClick={() => {
            send({ type: 'REPLAY' });
          }}
        >
          Replay question
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
          <label htmlFor="submitted-answer">Your answer</label>
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
          <Button
            variant="text"
            onClick={() => {
              send({ type: 'NEXT' });
            }}
          >
            {index + 1 === session.questions.length ? 'Finish and see report' : 'Next question'}
          </Button>
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
          <h2>What interviewers listen for</h2>
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
            {index + 1 === session.questions.length ? 'Finish and see report' : 'Next question'}
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
            Type instead
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
            Skip question
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={dialog !== null}
        title={
          dialog === 'end'
            ? 'End the session now?'
            : dialog === 'skip'
              ? 'Skip this question?'
              : 'Record this answer again?'
        }
        description={
          dialog === 'end'
            ? answered
              ? `Your report will include the ${answered} questions you’ve answered.`
              : 'You haven’t answered any questions yet, so there will be no report.'
            : dialog === 'skip'
              ? 'It will be marked as skipped in your report.'
              : 'Your current transcript will be discarded.'
        }
        confirm={
          dialog === 'end' ? 'End session' : dialog === 'skip' ? 'Skip question' : 'Record again'
        }
        cancel={
          dialog === 'end'
            ? 'Keep going'
            : dialog === 'skip'
              ? 'Keep answering'
              : 'Keep this answer'
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
    </div>
  );
}
