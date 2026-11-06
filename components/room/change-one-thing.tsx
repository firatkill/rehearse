'use client';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT } from '@/lib/i18n/context';
import type { Feedback } from '@/lib/feedback/schema';
import { lowestDimension } from '@/lib/report/feedback-view';
import { SafeText } from '@/components/common/safe-text';
import { Button } from '@/components/ui/button';

export function ChangeOneThing({
  feedback,
  onRetry,
}: {
  feedback: Feedback;
  onRetry?: () => void;
}) {
  const { DIMENSION_LABELS } = useLabels();

  const t = useT();

  const lowest = lowestDimension(feedback);
  const change = feedback.improvements.find((item) => item.dimension === lowest);
  return (
    <section className="feedback-change" aria-label={t('app.page.9')}>
      <h3>
        <T id="components.room.change.one.thing.1" />
        {DIMENSION_LABELS[lowest]}
      </h3>
      <p>
        <SafeText text={change?.point ?? feedback.scores[lowest].rationale} />
      </p>
      {change ? (
        <>
          <p>
            <T id="components.room.change.one.thing.2" />
          </p>
          <blockquote>
            <SafeText text={change.rewrite} />
          </blockquote>
        </>
      ) : (
        <p>
          <T id="components.room.change.one.thing.3" />
        </p>
      )}
      {onRetry && (
        <Button variant="on-dark" onClick={onRetry}>
          <T id="components.room.change.one.thing.4" />
        </Button>
      )}
    </section>
  );
}
