'use client';
import { useNumbers } from '@/lib/i18n/use-numbers';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { lengthVerdict, textLengthVerdict } from '@/lib/report/feedback-view';
import { formatMmSs } from '@/lib/time';
import { PACE, SPEECH, type AnswerMode } from '@/lib/config';
import type { DeliveryMetrics as Metrics } from '@/lib/storage/schema';
import { formatFillerBreakdown } from '@/lib/metrics/format';

export function DeliveryMetrics({
  metrics,
  mode = 'text',
  recordingMs,
}: {
  metrics: Metrics;
  mode?: AnswerMode;
  recordingMs?: number | null;
}) {
  const t = useT();
  const { number } = useNumbers();
  const { language } = useI18n();
  const verdict = (value: string) =>
    t(
      value === 'Too short'
        ? 'length.short'
        : value === 'On target'
          ? 'length.target'
          : value === 'Long'
            ? 'length.long'
            : 'ui.dynamic.49',
    );

  return (
    <section className="space-y-3">
      <h3>
        <T id="components.report.report.view.23" />
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 [&_dd]:font-mono">
        {(recordingMs !== undefined || mode === 'text') && (
          <>
            <dt>
              <T id="components.room.delivery.metrics.2" />
            </dt>
            <dd>
              {mode === 'text' ? (
                verdict(textLengthVerdict(metrics.words))
              ) : recordingMs === null || recordingMs === undefined ? (
                t('ui.dynamic.49')
              ) : (
                <>
                  {formatMmSs(recordingMs)} · {verdict(lengthVerdict(recordingMs))}
                </>
              )}
            </dd>
          </>
        )}
        <dt>
          <T id="components.room.delivery.metrics.3" />
        </dt>
        <dd>{number(metrics.words)}</dd>
        <dt>
          <T id="components.room.delivery.metrics.4" />
        </dt>
        <dd>{mode === 'text' ? t('ui.dynamic.50') : formatMmSs(metrics.speakingMs ?? 0)}</dd>
        <dt>
          <T id="components.room.delivery.metrics.5" />
        </dt>
        <dd>
          {mode === 'text'
            ? t('ui.dynamic.50')
            : metrics.wpm === null
              ? t('ui.dynamic.51')
              : t('ui.template.19', { v0: metrics.wpm })}
        </dd>
        <dt>
          <T id="components.room.delivery.metrics.6" />
        </dt>
        <dd>
          {number(metrics.fillers.total)}{' '}
          <span>
            {formatFillerBreakdown(metrics.fillers.byPhrase, language, t('fillers.none'))}
          </span>
        </dd>
        <dt>
          <T id="components.room.delivery.metrics.7" />
        </dt>
        <dd>
          {mode === 'text' || metrics.longestPauseMs === null || metrics.longPauses === null
            ? t('ui.dynamic.49')
            : t('ui.template.20', {
                v0: number(metrics.longestPauseMs / 1000, 1),
                v1: metrics.longPauses,
                v2: SPEECH.LONG_PAUSE_MS / 1000,
              })}
        </dd>
      </dl>
      <p>
        <T id="components.room.delivery.metrics.8" />
        {PACE.COMFORT_MIN_WPM}
        <T id="components.room.delivery.metrics.9" />
        {PACE.COMFORT_MAX_WPM}
        <T id="components.room.delivery.metrics.10" />
      </p>
    </section>
  );
}
