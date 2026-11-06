'use client';
import { T, useT } from '@/lib/i18n/context';
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
  const t = useT();

  return (
    <div className="room-think">
      <div className="think-clock">
        <TimerDisplay ms={remainingMs} />
      </div>
      <p>{mode === 'text' ? t('ui.dynamic.106') : t('ui.dynamic.107')}</p>
      <div className="think-progress" aria-hidden="true">
        <span
          style={{
            width: `${Math.max(0, Math.min(100, (remainingMs / (SESSION.THINK_SECONDS * 1000)) * 100))}%`,
          }}
        />
      </div>
      <p className="think-hint">
        <T id="components.room.think.timer.1" />
      </p>
      {wasPaused && (
        <p>
          <T id="components.room.think.timer.2" />
        </p>
      )}
      <Button variant="on-dark" className="min-h-11" data-phase-focus onClick={onStart}>
        <T id="components.room.think.timer.3" />
      </Button>
    </div>
  );
}
