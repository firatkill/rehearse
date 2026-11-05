'use client';
import { useState } from 'react';
import type { AnswerRecord, SessionRecord } from '@/lib/storage/schema';
import { Button } from '@/components/ui/button';
import { FeedbackCard } from './feedback-card';

export function AttemptFeedback({
  answer,
  question,
  onRetry,
}: {
  answer: AnswerRecord;
  question: SessionRecord['questions'][number];
  onRetry: () => void;
}) {
  const [selected, setSelected] = useState(answer.attemptRecords.length - 1);
  const attempt = answer.attemptRecords[selected];
  const shown = attempt ? { ...answer, ...attempt } : answer;
  const previous = answer.attemptRecords[selected - 1]?.feedback;
  const panelId = `attempt-panel-${answer.index}`;
  return (
    <>
      <div role="tablist" aria-label="Answer attempts">
        {answer.attemptRecords.map((item, index) => (
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
                    ? answer.attemptRecords.length - 1
                    : direction
                      ? (index + direction + answer.attemptRecords.length) %
                        answer.attemptRecords.length
                      : null;
              if (next === null) return;
              event.preventDefault();
              setSelected(next);
              document.getElementById(`attempt-tab-${answer.index}-${next}`)?.focus();
            }}
          >
            Attempt {item.ordinal}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={attempt ? `attempt-tab-${answer.index}-${selected}` : undefined}
      >
        <FeedbackCard answer={shown} question={question} previous={previous ?? null} />
      </div>
      <Button variant="on-dark" onClick={onRetry}>
        Try again with this
      </Button>
    </>
  );
}
