'use client';
import { useNumbers } from '@/lib/i18n/use-numbers';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { useEffect, useState } from 'react';
import { countWords } from '@/lib/metrics/words';
import { computeDelivery } from '@/lib/metrics/delivery';
import type { AnswerRecord } from '@/lib/storage/schema';
import { Button } from '@/components/ui/button';
import { durationWords } from '@/lib/i18n/duration';
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
  const t = useT();
  const { count } = useNumbers();
  const { language } = useI18n();

  const [notice, setNotice] = useState('');
  const notices = {
    time_limit: t('ui.template.29', { v0: durationWords(limit, t) }),
    char_cap: t('ui.template.30', { v0: count(ANSWER.MAX_CHARS) }),
    tab_hidden: t('ui.dynamic.75'),
    network: t('ui.dynamic.76'),
    unexpected_stop: t('ui.dynamic.77'),
    restored: t('ui.dynamic.78'),
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
  const metrics = computeDelivery(answer, undefined, language);
  return (
    <section className="space-y-4">
      <h2>
        <T id="components.room.review.panel.1" />
      </h2>
      <p>{answer.mode === 'text' ? t('ui.dynamic.79') : t('ui.dynamic.80')}</p>
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
      {empty && feedbackEnabled && (
        <p id="review-help">
          <T id="components.room.review.panel.2" />
        </p>
      )}
      {!online && feedbackEnabled && !empty && (
        <p id="review-help">
          <T id="components.room.review.panel.3" />
        </p>
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
              <T id="components.room.review.panel.4" />
            </Button>
            <Button className="min-h-11" variant="outline" onClick={onSave}>
              <T id="components.room.feedback.error.2" />
            </Button>
          </>
        ) : (
          <Button className="min-h-11" onClick={onSave}>
            <T id="components.room.review.panel.6" />
          </Button>
        )}
        {answer.mode === 'voice' && (
          <Button className="min-h-11" variant="outline" onClick={onRecordAgain}>
            <T id="components.room.review.panel.7" />
          </Button>
        )}
      </div>
    </section>
  );
}
