import { SESSION } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { TimerDisplay } from '@/components/common/timer-display';
export function ThinkTimer({
  remainingMs,
  wasPaused,
  mode,
  onStart,
}: {
  remainingMs: number;
  wasPaused: boolean;
  mode: 'voice' | 'text';
  onStart: () => void;
}) {
  return (
    <div className="room-think">
      <div className="think-clock">
        <TimerDisplay ms={remainingMs} />
      </div>
      <p>
        {mode === 'text'
          ? 'The answer box opens when the timer ends.'
          : 'Recording starts when the timer ends.'}
      </p>
      <div className="think-progress" aria-hidden="true">
        <span
          style={{
            width: `${Math.max(0, Math.min(100, (remainingMs / (SESSION.THINK_SECONDS * 1000)) * 100))}%`,
          }}
        />
      </div>
      <p className="think-hint">Try: what happened, what you did, what changed.</p>
      {wasPaused && <p>Timer paused while you were away.</p>}
      <Button variant="on-dark" className="min-h-11" data-phase-focus onClick={onStart}>
        Start now
      </Button>
    </div>
  );
}
