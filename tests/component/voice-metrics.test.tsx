import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DeliveryMetrics } from '@/components/room/delivery-metrics';
import { computeDelivery } from '@/lib/metrics/delivery';
test('TC-061 FR-24 PRD 9.7 distinguishes short voice speech, measured voice and text', () => {
  const a = {
    mode: 'voice' as const,
    transcript: 'I delivered results',
    rawTranscript: 'um I delivered results',
    timing: { recordingMs: 120000, firstResultOffsetMs: 1000, resultOffsetsMs: [1000, 2000] },
  };
  const { rerender } = render(<DeliveryMetrics mode="voice" metrics={computeDelivery(a)} />);
  expect(screen.getByText('Not enough speech to measure')).toBeVisible();
  expect(screen.getByText('0:01')).toBeVisible();
  rerender(
    <DeliveryMetrics
      mode="voice"
      metrics={computeDelivery({ ...a, timing: { ...a.timing, resultOffsetsMs: [1000, 11000] } })}
    />,
  );
  expect(screen.getByText('24 words per minute')).toBeVisible();
  expect(screen.getByText('10.0 s (1 pauses of 3 s or more)')).toBeVisible();
  rerender(<DeliveryMetrics mode="text" metrics={computeDelivery({ ...a, mode: 'text' })} />);
  expect(screen.getAllByText('Not measured in text mode')).toHaveLength(2);
});
