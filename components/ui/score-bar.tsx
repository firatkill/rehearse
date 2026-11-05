/** Four decorative segments; caller provides the text equivalent. Null is unscored. */
export function ScoreBar({ score }: { score: number | null }) {
  return (
    <span className="ui-score-bar" data-score={score} aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} data-filled={score !== null && n <= score} />
      ))}
    </span>
  );
}
