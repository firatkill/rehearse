'use client';
import { useT } from '@/lib/i18n/context';

import { useEffect, useRef, useState } from 'react';
import { FOLLOW_UP } from '@/lib/config';
import type {
  AnswerRecord,
  SessionRecord,
  AttemptRecord,
  FollowUpRecord,
} from '@/lib/storage/schema';
import { FeedbackCard } from './feedback-card';

function isFollowUpRecord(attempt: AttemptRecord): attempt is FollowUpRecord {
  return 'parentAttemptId' in attempt && 'prompt' in attempt;
}
export function AttemptFeedback({
  answer,
  question,
  onRetry,
  onFollowUp,
}: {
  answer: AnswerRecord;
  question: SessionRecord['questions'][number];
  onRetry: (feedback: NonNullable<AnswerRecord['feedback']>) => void;
  onFollowUp?: (parentAttemptId: string) => void;
}) {
  const t = useT();

  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[data-phase-focus]')?.focus();
  }, []);
  const items = [...answer.attemptRecords, ...answer.followUpRecords];
  const [selected, setSelected] = useState(
    answer.followUp ? items.length - 1 : answer.attemptRecords.length - 1,
  );
  const attempt = items[selected];
  const isFollowUp = attempt !== undefined && isFollowUpRecord(attempt);
  const shown = attempt ? { ...answer, ...attempt } : answer;
  const previous = isFollowUp ? null : answer.attemptRecords[selected - 1]?.feedback;
  const panelId = `attempt-panel-${answer.index}`;
  return (
    <>
      <div role="tablist" aria-label={t('attempts.label')}>
        {items.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            id={`attempt-tab-${answer.index}-${index}`}
            aria-controls={panelId}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            className="attempt-tab"
            onClick={() => {
              setSelected(index);
            }}
            onKeyDown={(event) => {
              const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : direction
                      ? (index + direction + items.length) % items.length
                      : null;
              if (next === null) return;
              event.preventDefault();
              setSelected(next);
              document.getElementById(`attempt-tab-${answer.index}-${next}`)?.focus();
            }}
          >
            {'parentAttemptId' in item ? t('components.room.room.8') : t('ui.dynamic.48')}{' '}
            {item.ordinal}
          </button>
        ))}
      </div>
      <div
        ref={panel}
        role="tabpanel"
        id={panelId}
        aria-labelledby={attempt ? `attempt-tab-${answer.index}-${selected}` : undefined}
      >
        <FeedbackCard
          answer={shown}
          question={
            isFollowUp
              ? { ...question, prompt: attempt.prompt, time_limit_s: FOLLOW_UP.TIME_LIMIT_S }
              : question
          }
          previous={previous ?? null}
          {...(isFollowUp || !shown.feedback
            ? {}
            : {
                onRetry: () => {
                  if (shown.feedback) onRetry(shown.feedback);
                },
              })}
          {...(!isFollowUp && attempt?.feedbackMeta?.followUpToken && onFollowUp
            ? {
                onFollowUp: () => {
                  onFollowUp(attempt.id);
                },
              }
            : {})}
        />
      </div>
    </>
  );
}
