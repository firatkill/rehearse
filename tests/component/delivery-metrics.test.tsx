import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeliveryMetrics } from '@/components/room/delivery-metrics';
import { computeDelivery } from '@/lib/metrics/delivery';
const timing = { recordingMs: null, firstResultOffsetMs: null, resultOffsetsMs: [] };
it('TC-038 CT-04 text delivery uses edited words/fillers and shows unavailable speech metrics', () => {
  const metrics = computeDelivery({
    mode: 'text',
    transcript: 'um um like so',
    rawTranscript: 'different',
    timing,
  });
  expect(metrics).toMatchObject({
    words: 4,
    speakingMs: null,
    wpm: null,
    longestPauseMs: null,
    longPauses: null,
    fillers: { total: 3 },
  });
  render(<DeliveryMetrics metrics={metrics} />);
  expect(screen.getByRole('heading', { name: 'Delivery', level: 3 })).toBeVisible();
  expect(screen.getAllByText('Not measured in text mode')).toHaveLength(2);
  expect(screen.getByText('Not available')).toBeVisible();
  expect(screen.getByText('(um 2, like 1)')).toBeVisible();
});
it('TC-038 CT-04 zero fillers and ties follow the documented list order', () => {
  const metrics = computeDelivery({
    mode: 'text',
    transcript: 'clear answer',
    rawTranscript: 'um',
    timing,
  });
  const { rerender } = render(<DeliveryMetrics metrics={metrics} />);
  expect(screen.getByText('None counted')).toBeVisible();
  rerender(
    <DeliveryMetrics
      metrics={{ ...metrics, fillers: { total: 4, byPhrase: { so: 1, like: 1, uh: 1, um: 1 } } }}
    />,
  );
  expect(screen.getByText('(um 1, uh 1, like 1, so 1)')).toBeVisible();
  expect(
    computeDelivery({ mode: 'text', transcript: 'um uh', rawTranscript: '', timing }, ['uh'])
      .fillers,
  ).toEqual({ total: 1, byPhrase: { uh: 1 } });
});
