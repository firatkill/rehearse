'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function QuotaPanel({
  kind,
  resetAt,
  sessionsPerDay,
  onPractise,
  onRetry,
  pending,
}: {
  kind: 'quota' | 'limiter_unavailable';
  resetAt?: string;
  sessionsPerDay: number;
  onPractise: () => void;
  onRetry: () => void;
  pending: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [kind]);
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
  return (
    <section className="space-y-4">
      <h2 ref={heading} tabIndex={-1}>
        {kind === 'quota'
          ? 'You’ve used today’s feedback sessions'
          : 'Feedback is unavailable right now'}
      </h2>
      <p>
        {kind === 'quota'
          ? `Each visitor gets feedback on ${sessionsPerDay} sessions per day. This resets at ${reset}. You can still practise now without feedback.`
          : 'The service that keeps the demo within its free limits isn’t responding. You can practise without feedback, or try again in a few minutes.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" type="button" disabled={pending} onClick={onPractise}>
          Practise without feedback
        </Button>
        {kind === 'quota' ? (
          <Link href="/sample">See the sample report</Link>
        ) : (
          <Button
            className="min-h-11"
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </section>
  );
}
