import { DIMENSION_LABELS } from '@/lib/labels';
import { PROGRESS } from '@/lib/config';
import { progressStats, type ProgressEntry } from '@/lib/report/progress';
import { LocalSessionTime } from '@/components/common/local-session-time';
import { DeltaBadge } from '@/components/ui/delta-badge';
export function ProgressOverview({ entries }: { entries: ProgressEntry[] }) {
  const stats = progressStats(entries);
  const x = (index: number) => 48 + (index * 544) / Math.max(1, stats.points.length - 1);
  const y = (score: number) => 200 - (score - 1) * 60;
  return (
    <>
      <p className="progress-totals">
        {entries.length} sessions · {stats.answers} answers · {stats.recordingMinutes} min of
        recorded practice
      </p>
      <p className="progress-note">Text practice time isn’t measured.</p>
      <div className="progress-panels">
        <section className="progress-card" aria-labelledby="progress-trend-heading">
          <div className="progress-section-heading">
            <h2 id="progress-trend-heading">Overall, by session</h2>
            <span>Last {PROGRESS.TREND_SESSIONS} scored sessions</span>
          </div>
          {stats.points.length === 0 ? (
            <p>Finish a session with feedback to see your scores here.</p>
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
                <summary>View score table</summary>
                <table>
                  <caption>Overall score by session</caption>
                  <thead>
                    <tr>
                      <th scope="col">Session date</th>
                      <th scope="col">Overall</th>
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
            <h2 id="progress-dimensions-heading">By dimension</h2>
            <span>
              Last {stats.latestCount} vs previous {PROGRESS.COMPARE_SESSIONS}
            </span>
          </div>
          <table className="progress-dimensions">
            <caption className="sr-only">Dimension averages and change</caption>
            <thead>
              <tr>
                <th scope="col">Dimension</th>
                <th scope="col">
                  <span className="sr-only">Recent scores</span>
                </th>
                <th scope="col">Average</th>
                <th scope="col">Change</th>
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
              Complete six scored sessions to compare the last three with the previous three.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
