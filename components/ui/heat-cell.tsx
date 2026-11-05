/** Text score or em dash; no score is represented as zero. */
export function HeatCell({ score }: { score: number | null }) {
  return (
    <span className="ui-heat-cell" data-score={score}>
      {score ?? '—'}
      {score === null && <span className="sr-only"> Not scored</span>}
    </span>
  );
}
