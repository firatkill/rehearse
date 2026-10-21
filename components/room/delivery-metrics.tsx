import { PACE } from '@/lib/config';
import type { DeliveryMetrics as Metrics } from '@/lib/storage/schema';
import { formatFillerBreakdown } from '@/lib/metrics/format';

export function DeliveryMetrics({ metrics }: { metrics: Metrics }) {
  return (
    <section className="space-y-3">
      <h3>Delivery</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 [&_dd]:font-mono">
        <dt>Words</dt>
        <dd>{metrics.words}</dd>
        <dt>Speaking time</dt>
        <dd>Not measured in text mode</dd>
        <dt>Pace</dt>
        <dd>Not measured in text mode</dd>
        <dt>Filler words</dt>
        <dd>
          {metrics.fillers.total} <span>{formatFillerBreakdown(metrics.fillers.byPhrase)}</span>
        </dd>
        <dt>Longest pause</dt>
        <dd>Not available</dd>
      </dl>
      <p>
        Most listeners find {PACE.COMFORT_MIN_WPM} to {PACE.COMFORT_MAX_WPM} words per minute
        comfortable. Filler words are counted by simple rules, so a few may be legitimate uses.
      </p>
    </section>
  );
}
