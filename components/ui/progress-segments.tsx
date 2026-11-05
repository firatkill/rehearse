/** Zero-based current question; decorative progress accompanies a readable counter. */
export function ProgressSegments({ current, total }: { current: number; total: number }) {
  return (
    <div>
      <span className="font-mono text-xs">
        Question {Math.min(current + 1, total)} of {total}
      </span>
      <div className="ui-progress" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            data-state={index < current ? 'done' : index === current ? 'current' : 'remaining'}
          />
        ))}
      </div>
    </div>
  );
}
