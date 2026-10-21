import { chartSegments } from '@/lib/report/chart';
import type { Aggregates } from '@/lib/report/aggregate';
export function TrendChart({ values }: { values: Aggregates }) {
  if (values.scoredCount < 2) return null;
  return (
    <svg viewBox="0 0 600 200" width="100%" aria-hidden="true" focusable="false">
      {[1, 2, 3, 4].map((score) => (
        <g key={score}>
          <line
            x1={48}
            x2={576}
            y1={168 - ((score - 1) * 152) / 3}
            y2={168 - ((score - 1) * 152) / 3}
            stroke="var(--rule)"
          />
          <text
            x={24}
            y={172 - ((score - 1) * 152) / 3}
            fill="var(--ink-3)"
            className="font-mono"
            fontSize={12}
          >
            {score}
          </text>
        </g>
      ))}
      {values.perQuestion.map((q, i) => (
        <text
          key={q.index}
          x={48 + (i * 528) / (values.perQuestion.length - 1)}
          y={192}
          textAnchor="middle"
          fill="var(--ink-3)"
          className="font-mono"
          fontSize={12}
        >
          Q{q.index + 1}
        </text>
      ))}
      {chartSegments(values.perQuestion).map((segment, i) => (
        <g key={i}>
          <polyline
            points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke="var(--accent)"
            strokeWidth={2}
            fill="none"
          />
          {segment.map((p) => (
            <circle key={p.index} cx={p.x} cy={p.y} r={4} fill="var(--accent)" />
          ))}
        </g>
      ))}
    </svg>
  );
}
