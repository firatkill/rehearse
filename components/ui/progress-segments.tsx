import { T } from '@/lib/i18n/context';
/** Zero-based current question; decorative progress accompanies a readable counter. */
export function ProgressSegments({ current, total }: { current: number; total: number }) {
  return (
    <div>
      <span className="font-mono text-xs">
        <T id="components.report.report.view.31" />
        {Math.min(current + 1, total)}
        <T id="components.jobpost.job.post.16" />
        {total}
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
