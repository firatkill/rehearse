'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useInterviewRoom } from '@/hooks/use-interview-room';
import { useShell } from '@/components/layout/shell';
import { LiveRegion } from '@/components/common/live-region';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SafeText } from '@/components/common/safe-text';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS, SENIORITY_LABELS, ANSWER_MODE_LABELS } from '@/lib/labels';
import { SESSION } from '@/lib/config';
import { ProgressHeader } from './progress-header';
import { QuestionPanel } from './question-panel';
import { ThinkTimer } from './think-timer';
import { TextAnswer } from './text-answer';
import { ReviewPanel } from './review-panel';
import { ResumeCard } from './resume-card';
import { DeliveryMetrics } from './delivery-metrics';

export function Room({ id, offline }: { id: string; offline: boolean }) {
  const { state, send, onDraft, online } = useInterviewRoom(id);
  const { announce, message, registerEnd } = useShell();
  const root = useRef<HTMLDivElement>(null);
  const { session, phase, index } = state;
  const kind = phase.kind;
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
      kind === 'thinking'
        ? `${SESSION.THINK_SECONDS} seconds to think.`
        : kind === 'answering'
          ? 'Answer box open.'
          : kind === 'review'
            ? 'Review your answer.'
            : kind === 'saved'
              ? 'Answer saved.'
              : '';
    announce(status);
  }, [kind, index, state.mode, session, announce]);
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
  const question = session.questions[index];
  const answer = state.answers.find((a) => a.index === index);
  const answered = state.answers.filter(
    (a) => a.status === 'saved' || a.status === 'scored',
  ).length;
  const dialog = state.dialog;
  const start = () => {
    send({ type: 'START_INTERVIEW' });
  };
  return (
    <div ref={root} className="space-y-6 py-8">
      <ProgressHeader session={session} index={index} />
      <LiveRegion visible message={message} />
      {kind === 'intro' ? (
        state.restoredNotice ? (
          <ResumeCard index={index} total={session.questions.length} onContinue={start} />
        ) : (
          <section className="space-y-4">
            <h1>Ready when you are</h1>
            <p>
              {session.questions.length} questions · {ROLE_LABELS[session.setup.role]},{' '}
              {SENIORITY_LABELS[session.setup.seniority]} · {ANSWER_MODE_LABELS[state.mode]} answers
            </p>
            {!session.feedback.enabled && (
              <p>
                Feedback is off for this session. You’ll see your transcript and delivery numbers.
              </p>
            )}
            <Button data-phase-focus className="min-h-11" onClick={start}>
              Start the interview
            </Button>
          </section>
        )
      ) : (
        question && <QuestionPanel prompt={question.prompt} />
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
      {kind === 'saved' && answer && question && (
        <section className="space-y-4">
          <DeliveryMetrics metrics={answer.metrics} />
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
      {state.mode === 'voice' &&
        ['asking', 'thinking', 'answering', 'speech-error'].includes(kind) && (
          <Button
            className="min-h-11"
            onClick={() => {
              send({ type: 'TYPE_INSTEAD' });
            }}
          >
            Type instead
          </Button>
        )}
      {['intro', 'asking', 'thinking', 'answering', 'speech-error', 'review'].includes(kind) && (
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => {
            send({ type: 'OPEN_DIALOG', dialog: 'skip' });
          }}
        >
          Skip question
        </Button>
      )}
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
