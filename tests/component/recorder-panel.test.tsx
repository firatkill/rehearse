import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { RecorderPanel } from '@/components/room/recorder-panel';
import { SpeechError } from '@/components/room/speech-error';
test('TC-057 FR-11 TRD 11.2 recording announces thresholds once and stops at its limit', async () => {
  const announce = vi.fn<(text: string) => void>();
  const onLimit = vi.fn();
  const view = render(
    <RecorderPanel
      transcript={{ committed: 'First', runFinal: 'final', runInterim: 'interim' }}
      startedAt={Date.now()}
      limit={120}
      announce={announce}
      onStop={vi.fn()}
      onLimit={onLimit}
    />,
  );
  expect(screen.getByRole('region', { name: 'Live transcript' })).toHaveAttribute(
    'aria-live',
    'off',
  );
  expect(screen.getByText('interim')).toHaveAttribute('aria-hidden', 'true');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(announce.mock.calls.map((call) => call[0])).toEqual([
    '1 minute left.',
    '30 seconds left.',
    '10 seconds left.',
  ]);
  expect(onLimit).toHaveBeenCalledOnce();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(onLimit).toHaveBeenCalledOnce();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
test('TC-057 FR-11 TRD 11.2 a 60-second limit omits the one-minute threshold', async () => {
  const announce = vi.fn<(text: string) => void>();
  render(
    <RecorderPanel
      transcript={{ committed: '', runFinal: '', runInterim: '' }}
      startedAt={Date.now()}
      limit={60}
      announce={announce}
      onStop={vi.fn()}
      onLimit={vi.fn()}
    />,
  );
  expect(screen.getByText('Start speaking. Your words will appear here.')).toBeVisible();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(announce.mock.calls.map((call) => call[0])).toEqual([
    '30 seconds left.',
    '10 seconds left.',
  ]);
});
test.each(['permission', 'no-device', 'no-speech', 'unavailable'] as const)(
  'TC-058 FR-15 error %s exposes the specified focus target',
  (error) => {
    const { container } = render(<SpeechError error={error} onRetry={vi.fn()} onType={vi.fn()} />);
    expect(container.querySelector('[data-phase-focus]')).toHaveTextContent(
      error === 'no-speech' ? 'Try again' : 'Type instead',
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeVisible();
  },
);
