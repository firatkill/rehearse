'use client';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT } from '@/lib/i18n/context';
import { PROGRESS } from '@/lib/config';
import { progressStats, type ProgressEntry } from '@/lib/report/progress';
import { LocalSessionTime } from '@/components/common/local-session-time';
import { DeltaBadge } from '@/components/ui/delta-badge';
export function ProgressOverview({ entries }: { entries: ProgressEntry[] }) {
  const t = useT();

  const { DIMENSION_LABELS } = useLabels();

  const stats = progressStats(entries);
  const x = (index: number) => 48 + (index * 544) / Math.max(1, stats.points.length - 1);
  const y = (score: number) => 200 - (score - 1) * 60;
  return (
    <>
      <p className="progress-totals">
        {entries.length}
        <T id="components.history.progress.overview.1" />
        {stats.answers}
        <T id="components.history.progress.overview.2" />
        {stats.recordingMinutes}
        <T id="components.history.progress.overview.3" />
      </p>
      <p className="progress-note">
        <T id="components.history.progress.overview.4" />
      </p>
      <div className="progress-panels">
        <section className="progress-card" aria-labelledby="progress-trend-heading">
          <div className="progress-section-heading">
            <h2 id="progress-trend-heading">
              <T id="components.history.progress.overview.5" />
            </h2>
            <span>
              <T id="components.history.progress.overview.6" />
              {PROGRESS.TREND_SESSIONS}
              <T id="components.history.progress.overview.7" />
            </span>
          </div>
          {stats.points.length === 0 ? (
            <p>
              <T id="components.history.progress.overview.8" />
            </p>
          ) : (
            <>
              <svg
                viewBox="0 0 640 220"
                aria-hidden="true"
                focusable="false"
                className="progress-chart"
              >
                {[1, 2, 3, 4].map((score) => (
                  <g key={score}>
                    <line x1="40" x2="620" y1={y(score)} y2={y(score)} stroke="var(--rule)" />
                    <text x="8" y={y(score) + 4} fill="var(--ink-3)" fontSize="12">
                      {score}
                    </text>
                  </g>
                ))}
                {stats.points.length > 1 && (
                  <polyline
                    points={stats.points
                      .map((point, index) => `${x(index)},${y(point.overall ?? 1)}`)
                      .join(' ')}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                  />
                )}
                {stats.points.map((point, index) => (
                  <circle
                    key={point.session.id}
                    cx={x(index)}
                    cy={y(point.overall ?? 1)}
                    r="4"
                    fill="var(--accent)"
                  />
                ))}
              </svg>
              <details className="progress-chart-data">
                <summary>
                  <T id="components.history.progress.overview.9" />
                </summary>
                <table>
                  <caption>
                    <T id="components.history.progress.overview.10" />
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <T id="components.history.progress.overview.11" />
                      </th>
                      <th scope="col">
                        <T id="components.history.history.list.9" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.points.map((point) => (
                      <tr key={point.session.id}>
                        <th scope="row">
                          <LocalSessionTime value={point.session.createdAt} />
                        </th>
                        <td>{point.overall?.toFixed(1)} / 4</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </section>
        <section className="progress-card" aria-labelledby="progress-dimensions-heading">
          <div className="progress-section-heading">
            <h2 id="progress-dimensions-heading">
              <T id="components.history.progress.overview.13" />
            </h2>
            <span>
              {stats.scoredCount < PROGRESS.COMPARE_SESSIONS * 2
                ? t('ui.template.6', { v0: stats.latestCount })
                : t('ui.template.7', {
                    v0: PROGRESS.COMPARE_SESSIONS,
                    v1: PROGRESS.COMPARE_SESSIONS,
                  })}
            </span>
          </div>
          <table className="progress-dimensions">
            <caption className="sr-only">
              <T id="components.history.progress.overview.14" />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T id="components.history.progress.overview.15" />
                </th>
                <th scope="col">
                  <span className="sr-only">
                    <T id="components.history.progress.overview.16" />
                  </span>
                </th>
                <th scope="col">
                  <T id="components.history.progress.overview.17" />
                </th>
                <th scope="col">
                  <T id="components.history.progress.overview.18" />
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.dimensions.map((item) => (
                <tr key={item.dimension}>
                  <th scope="row">{DIMENSION_LABELS[item.dimension]}</th>
                  <td>
                    <span className="progress-spark" aria-hidden="true">
                      {item.history.map((score, index) => (
                        <span key={index} style={{ height: `${(score ?? 0) * 25}%` }} />
                      ))}
                    </span>
                  </td>
                  <td>{item.value?.toFixed(1) ?? '—'}</td>
                  <td>
                    <DeltaBadge value={item.delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.scoredCount < PROGRESS.COMPARE_SESSIONS * 2 && (
            <p className="progress-note">
              <T id="components.history.progress.overview.19" />
            </p>
          )}
        </section>
      </div>
    </>
  );
}
