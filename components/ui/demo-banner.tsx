import Link from 'next/link';
/** Persistent edition notice, rendered only when demo is explicitly selected. */
export function DemoBanner({ edition }: { edition: 'demo' | 'full' }) {
  return edition === 'demo' ? (
    <div className="ui-demo-banner" role="status">
      <span className="ui-demo-pill">DEMO</span>
      <span>
        You’re trying the demo. Feedback here is pre-written sample data and no AI is called.
      </span>
      <Link href="/#self-host">Run the full version yourself</Link>
    </div>
  ) : null;
}
