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
    <div className="space-y-4">
      <div className="text-4xl">
        <TimerDisplay ms={remainingMs} />
      </div>
      <p>
        {mode === 'text'
          ? 'The answer box opens when the timer ends.'
          : 'Recording starts when the timer ends.'}
      </p>
      {wasPaused && <p>Timer paused while you were away.</p>}
      <Button className="min-h-11" data-phase-focus onClick={onStart}>
        Start answering now
      </Button>
    </div>
  );
}
