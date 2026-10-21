import { formatMmSs } from '@/lib/time';
import { PACE, SPEECH, type AnswerMode } from '@/lib/config';
import type { DeliveryMetrics as Metrics } from '@/lib/storage/schema';
import { formatFillerBreakdown } from '@/lib/metrics/format';

export function DeliveryMetrics({
  metrics,
  mode = 'text',
}: {
  metrics: Metrics;
  mode?: AnswerMode;
}) {
  return (
    <section className="space-y-3">
      <h3>Delivery</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 [&_dd]:font-mono">
        <dt>Words</dt>
        <dd>{metrics.words}</dd>
        <dt>Speaking time</dt>
        <dd>
          {mode === 'text' ? 'Not measured in text mode' : formatMmSs(metrics.speakingMs ?? 0)}
        </dd>
        <dt>Pace</dt>
        <dd>
          {mode === 'text'
            ? 'Not measured in text mode'
            : metrics.wpm === null
              ? 'Not enough speech to measure'
              : `${metrics.wpm} words per minute`}
        </dd>
        <dt>Filler words</dt>
        <dd>
          {metrics.fillers.total} <span>{formatFillerBreakdown(metrics.fillers.byPhrase)}</span>
        </dd>
        <dt>Longest pause</dt>
        <dd>
          {mode === 'text' || metrics.longestPauseMs === null || metrics.longPauses === null
            ? 'Not available'
            : `${(metrics.longestPauseMs / 1000).toFixed(1)} s (${metrics.longPauses} pauses of ${SPEECH.LONG_PAUSE_MS / 1000} s or more)`}
        </dd>
      </dl>
      <p>
        Most listeners find {PACE.COMFORT_MIN_WPM} to {PACE.COMFORT_MAX_WPM} words per minute
        comfortable. Filler words are counted by simple rules, so a few may be legitimate uses.
      </p>
    </section>
  );
}
