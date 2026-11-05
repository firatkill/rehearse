import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { RecorderPanel } from '@/components/room/recorder-panel';
import { ThinkTimer } from '@/components/room/think-timer';
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

test('TC-141 V-15 recording guide is coaching copy, not a different cutoff', async () => {
  const onLimit = vi.fn();
  render(
    <RecorderPanel
      transcript={{ committed: '', runFinal: '', runInterim: '' }}
      startedAt={Date.now()}
      limit={90}
      announce={vi.fn()}
      onStop={vi.fn()}
      onLimit={onLimit}
    />,
  );
  expect(screen.getByText('aim for 1:00–2:00')).toBeVisible();
  expect(screen.getByText(/Maximum 90 seconds/)).toBeVisible();
  expect(screen.getByRole('region', { name: 'Live transcript' })).toHaveAttribute(
    'aria-live',
    'off',
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(90000);
  });
  expect(onLimit).toHaveBeenCalledOnce();
});

test('TC-141 V-15 thinking uses the approved action and static coaching hint', () => {
  const onStart = vi.fn();
  render(<ThinkTimer remainingMs={9000} wasPaused={false} mode="voice" onStart={onStart} />);
  expect(screen.getByText('Try: what happened, what you did, what changed.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Start now' }));
  expect(onStart).toHaveBeenCalledOnce();
});
