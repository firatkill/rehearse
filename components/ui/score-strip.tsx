import { DIMENSIONS, type Dimension } from '@/lib/config';
import { DIMENSION_LABELS } from '@/lib/labels';
import { ScoreBar } from './score-bar';
/** All six dimensions; text equivalents remain available when colour/bars are hidden. */
export function ScoreStrip({ scores }: { scores: Record<Dimension, number | null> }) {
  return (
    <ul className="ui-score-strip" aria-label="Scores">
      {DIMENSIONS.map((d) => (
        <li key={d}>
          <span className="sr-only">
            {DIMENSION_LABELS[d]}: {scores[d] === null ? 'Not scored' : `${scores[d]} out of 4`}
          </span>
          <span aria-hidden="true" className="font-mono">
            {DIMENSION_LABELS[d]}
          </span>
          <ScoreBar score={scores[d]} />
          <span aria-hidden="true" className="font-mono">
            {scores[d] === null ? '—' : `${scores[d]} / 4`}
          </span>
        </li>
      ))}
    </ul>
  );
}
