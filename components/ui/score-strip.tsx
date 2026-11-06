'use client';
import { useLabels } from '@/lib/i18n/use-labels';

import { useT } from '@/lib/i18n/context';
import { DIMENSIONS, type Dimension } from '@/lib/config';
import { ScoreBar } from './score-bar';
/** All six dimensions; text equivalents remain available when colour/bars are hidden. */
export function ScoreStrip({ scores }: { scores: Record<Dimension, number | null> }) {
  const { DIMENSION_LABELS } = useLabels();

  const t = useT();

  return (
    <ul className="ui-score-strip" aria-label={t('components.room.feedback.card.22')}>
      {DIMENSIONS.map((d) => (
        <li key={d}>
          <span className="sr-only">
            {DIMENSION_LABELS[d]}:{' '}
            {scores[d] === null ? t('ui.dynamic.47') : t('ui.template.47', { v0: scores[d] })}
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
