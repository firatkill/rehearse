import { answer } from '../fixtures/records';
import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeliveryMetrics } from '@/components/room/delivery-metrics';
import { computeDelivery } from '@/lib/metrics/delivery';
import { I18nProvider } from '@/lib/i18n/context';
import { messages } from '@/messages/tr';
const timing = { recordingMs: null, firstResultOffsetMs: null, resultOffsetsMs: [] };
it('TC-208 TC-211 Turkish filler breakdown agrees with its total and localises the empty state', () => {
  const metrics = computeDelivery(
    { mode: 'text', transcript: 'Şey, yani, düşündüm.', rawTranscript: '', timing },
    undefined,
    'tr',
  );
  const view = render(
    <I18nProvider initialLanguage="tr" initialMessages={messages}>
      <DeliveryMetrics metrics={metrics} />
    </I18nProvider>,
  );
  expect(screen.getByText('(şey 1, yani 1)')).toBeVisible();
  expect(screen.getByText('Dolgu sözcükleri').nextElementSibling).toHaveTextContent('2');
  view.rerender(
    <I18nProvider initialLanguage="tr" initialMessages={messages}>
      <DeliveryMetrics metrics={{ ...metrics, fillers: { total: 0, byPhrase: {} } }} />
    </I18nProvider>,
  );
  expect(screen.getByText('Hiç sayılmadı')).toBeVisible();
});
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

it.each([
  [0, 'Too short'],
  [39, 'Too short'],
  [40, 'On target'],
  [240, 'On target'],
  [241, 'Long'],
] as const)('TC-158 text length at %i words is %s', (words, verdict) => {
  render(<DeliveryMetrics mode="text" metrics={{ ...answer.metrics, words }} />);
  expect(screen.getByText('Length').nextElementSibling).toHaveTextContent(verdict);
  expect(screen.getByText('Speaking time').nextElementSibling).toHaveTextContent(
    'Not measured in text mode',
  );
});
