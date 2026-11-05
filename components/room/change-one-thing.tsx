import type { Feedback } from '@/lib/feedback/schema';
import { DIMENSION_LABELS } from '@/lib/labels';
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
  const lowest = lowestDimension(feedback);
  const change = feedback.improvements.find((item) => item.dimension === lowest);
  return (
    <section className="feedback-change" aria-label="Change one thing">
      <h3>Change one thing · {DIMENSION_LABELS[lowest]}</h3>
      <p>
        <SafeText text={change?.point ?? feedback.scores[lowest].rationale} />
      </p>
      {change ? (
        <>
          <p>Try saying:</p>
          <blockquote>
            <SafeText text={change.rewrite} />
          </blockquote>
        </>
      ) : (
        <p>This older feedback has no targeted rewrite. Use the guidance above and try again.</p>
      )}
      {onRetry && (
        <Button variant="on-dark" onClick={onRetry}>
          Try again with this
        </Button>
      )}
    </section>
  );
}
