'use client';
import { useNumbers } from '@/lib/i18n/use-numbers';
import { T } from '@/lib/i18n/context';
/** Text score or em dash; no score is represented as zero. */
export function HeatCell({ score }: { score: number | null }) {
  const { number } = useNumbers();
  return (
    <span className="ui-heat-cell" data-score={score}>
      {score === null ? '—' : number(score)}
      {score === null && (
        <span className="sr-only">
          <T id="components.ui.heat.cell.1" />
        </span>
      )}
    </span>
  );
}
