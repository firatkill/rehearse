'use client';
import { useEffect, useState } from 'react';
import { countWords } from '@/lib/metrics/words';
import { computeDelivery } from '@/lib/metrics/delivery';
import type { AnswerRecord } from '@/lib/storage/schema';
import { Button } from '@/components/ui/button';
import { formatDurationWords } from '@/lib/time';
import { ANSWER } from '@/lib/config';
import { AnswerEditor } from './answer-editor';
import { DeliveryMetrics } from './delivery-metrics';
export function ReviewPanel({
  answer,
  feedbackEnabled,
  online,
  limit,
  onEdit,
  onSubmit,
  onSave,
  onRecordAgain,
}: {
  answer: AnswerRecord;
  feedbackEnabled: boolean;
  online: boolean;
  limit: number;
  onEdit: (text: string) => void;
  onSubmit: () => void;
  onSave: () => void;
  onRecordAgain: () => void;
}) {
  const [notice, setNotice] = useState('');
  const notices = {
    time_limit: `Time’s up. Recording stopped at ${formatDurationWords(limit)}.`,
    char_cap: `Recording stopped at the ${ANSWER.MAX_CHARS.toLocaleString('en-GB')}-character limit.`,
    tab_hidden: 'Recording stopped because you left the tab.',
    network: 'Speech recognition lost its connection. Your words so far are below.',
    unexpected_stop: 'Recording stopped unexpectedly. Your words so far are below.',
    restored: 'We restored your answer after the page reloaded.',
  };
  const noticeText = answer.notice ? notices[answer.notice] : '';
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotice(noticeText);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [noticeText]);
  const empty = countWords(answer.transcript) === 0;
  const metrics = computeDelivery(answer);
  return (
    <section className="space-y-4">
      <h2>Review your answer</h2>
      <p>
        {answer.mode === 'text'
          ? 'Make any last changes. What you see here is what gets scored.'
          : 'Fix any words the recognition got wrong. What you see here is what gets scored.'}
      </p>
      <div role="status">{notice}</div>
      <AnswerEditor
        value={answer.transcript}
        onChange={onEdit}
        onContinue={() => {
          if (!feedbackEnabled) onSave();
          else if (!empty && online) onSubmit();
        }}
      />
      <DeliveryMetrics metrics={metrics} mode={answer.mode} />
      {empty && feedbackEnabled && <p id="review-help">Say or type an answer first.</p>}
      {!online && feedbackEnabled && !empty && (
        <p id="review-help">You’re offline. Feedback needs a connection.</p>
      )}
      <div className="flex flex-wrap gap-3">
        {feedbackEnabled ? (
          <>
            <Button
              className="min-h-11"
              disabled={empty || !online}
              aria-describedby={empty || !online ? 'review-help' : undefined}
              onClick={onSubmit}
            >
              Get feedback
            </Button>
            <Button className="min-h-11" variant="outline" onClick={onSave}>
              Save without feedback
            </Button>
          </>
        ) : (
          <Button className="min-h-11" onClick={onSave}>
            Save and continue
          </Button>
        )}
        {answer.mode === 'voice' && (
          <Button className="min-h-11" variant="outline" onClick={onRecordAgain}>
            Record again
          </Button>
        )}
      </div>
    </section>
  );
}
