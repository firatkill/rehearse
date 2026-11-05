import { Profiler } from 'react';
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RecorderPanel } from '@/components/room/recorder-panel';
import { PERFORMANCE } from '@/lib/config';
it('TC-194 transcript update React render duration stays within 16 ms', () => {
  vi.useRealTimers();
  const durations: number[] = [];
  const noop = () => {};
  const start = Date.now();
  const panel = (text: string) => (
    <Profiler
      id="recorder"
      onRender={(_id, phase, duration) => {
        if (phase === 'update') durations.push(duration);
      }}
    >
      <RecorderPanel
        transcript={{ committed: '', runFinal: '', runInterim: text }}
        startedAt={start}
        limit={120}
        announce={noop}
        onStop={noop}
        onLimit={noop}
      />
    </Profiler>
  );
  const view = render(panel(''));
  for (let n = 0; n < 5; n++) view.rerender(panel(`Measured practice result ${n}`));
  expect(durations).toHaveLength(5);
  expect(Math.max(...durations)).toBeLessThanOrEqual(PERFORMANCE.RESULT_COMMIT_MS);
});
