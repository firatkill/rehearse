'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SafeText } from '@/components/common/safe-text';
import { SESSION } from '@/lib/config';
import type { ErrorCode } from '@/lib/errors';

export function FeedbackError({
  code,
  requestId,
  retries,
  network,
  resetAt,
  feedbackPerDay,
  globalPerDay,
  online,
  onRetry,
  onSave,
}: {
  code: ErrorCode;
  requestId: string | null;
  retries: number;
  network: boolean;
  resetAt: string | null;
  feedbackPerDay: number;
  globalPerDay: number;
  online: boolean;
  onRetry: () => void;
  onSave: () => void;
}) {
  const [now] = useState(() => Date.now());
  let reset = '';
  if (resetAt) {
    const date = new Date(resetAt);
    const minutes = (date.getTime() - now) / 60000;
    const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil(minutes < 60 ? minutes : minutes / 60),
      minutes < 60 ? 'minute' : 'hour',
    );
    reset = `${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)} (${relative})`;
  }
  let title = 'Something went wrong on our side';
  let body = `Your answer is saved. Try again in a minute. (Reference ${requestId?.slice(0, 8) ?? ''})`;
  let retry = true;
  let restart = false;
  let focus: 'heading' | 'retry' | 'save' = 'retry';
  if (network) {
    title = 'Connection lost';
    body = 'Your answer is saved. Check your connection and try again.';
  } else
    switch (code) {
      case 'PROVIDER_ERROR':
      case 'PROVIDER_TIMEOUT':
      case 'FEEDBACK_INVALID':
        title = 'Feedback didn’t arrive';
        body = `The language model didn’t respond in time or sent something we couldn’t use. Your answer is saved. ${retries > 0 ? `You have ${retries} retries left in this session.` : 'You have no spare retries left; trying again uses an attempt meant for a later question.'}`;
        break;
      case 'LIMITER_UNAVAILABLE':
        title = 'Feedback didn’t arrive';
        body =
          'The service that keeps the demo within its free limits isn’t responding. Your answer is saved.';
        break;
      case 'SESSION_FEEDBACK_EXHAUSTED':
        title = 'No feedback attempts left in this session';
        body =
          'Your answer is saved. You can finish the session without feedback for the remaining questions.';
        retry = false;
        focus = 'save';
        break;
      case 'FEEDBACK_QUOTA_EXCEEDED':
        title = 'You’ve reached today’s feedback limit';
        body = `Each visitor can get ${feedbackPerDay} answers scored per day. It resets at ${reset}. Your answer is saved.`;
        retry = false;
        focus = 'heading';
        break;
      case 'GLOBAL_CAP_REACHED':
        title = 'The demo has reached its daily limit';
        body = `Rehearse scores up to ${globalPerDay} answers a day across all visitors so it stays free. It resets at ${reset}. Your answer is saved, and you can run Rehearse yourself from the GitHub repository.`;
        retry = false;
        focus = 'heading';
        break;
      case 'DEMO_READONLY':
        title = 'Feedback is paused on the live demo';
        body = 'Your answer is saved. You can continue without feedback.';
        retry = false;
        focus = 'heading';
        break;
      case 'TOKEN_EXPIRED':
        title = 'This session’s feedback window has closed';
        body = `Feedback is available for ${SESSION.TOKEN_TTL_S / 3600} hours after a session starts. Your answer is saved; you can finish without feedback or start a new session.`;
        retry = false;
        restart = true;
        focus = 'heading';
        break;
      case 'TOKEN_INVALID':
      case 'TOKEN_MISSING':
      case 'TOKEN_SCOPE':
        title = 'Feedback isn’t available for this session';
        body = 'Your answer is saved. You can finish without feedback or start a new session.';
        retry = false;
        restart = true;
        focus = 'heading';
        break;
    }
  return (
    <section className="space-y-4">
      <div role="alert" aria-live="assertive" aria-atomic="true">
        <h2 tabIndex={-1} data-phase-focus={focus === 'heading' || undefined}>
          {title}
        </h2>
      </div>
      <p>
        <SafeText text={body} />
      </p>
      <div className="flex flex-wrap gap-3">
        {retry && (
          <Button
            data-phase-focus={focus === 'retry' || undefined}
            disabled={!online}
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
        <Button data-phase-focus={focus === 'save' || undefined} onClick={onSave}>
          Save without feedback
        </Button>
        {restart && (
          <Link className="inline-flex min-w-11 items-center" href="/setup">
            Start a new session
          </Link>
        )}
      </div>
    </section>
  );
}
