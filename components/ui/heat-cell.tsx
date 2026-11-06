import { T } from '@/lib/i18n/context';
/** Text score or em dash; no score is represented as zero. */
export function HeatCell({ score }: { score: number | null }) {
  return (
    <span className="ui-heat-cell" data-score={score}>
      {score ?? '—'}
      {score === null && (
        <span className="sr-only">
          <T id="components.ui.heat.cell.1" />
        </span>
      )}
    </span>
  );
}
