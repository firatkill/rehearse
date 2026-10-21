import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReviewPanel } from '@/components/room/review-panel';
import { answer } from '../fixtures/records';
const callbacks = () => ({
  onEdit: vi.fn(),
  onSubmit: vi.fn(),
  onSave: vi.fn(),
  onRecordAgain: vi.fn(),
});
it('TC-039 CT-05 empty and offline feedback guards keep saving available', () => {
  const actions = callbacks();
  const { rerender } = render(
    <ReviewPanel
      answer={{ ...answer, transcript: '' }}
      feedbackEnabled
      online
      limit={120}
      {...actions}
    />,
  );
  expect(screen.getByRole('button', { name: 'Get feedback' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Get feedback' })).toHaveAccessibleDescription(
    'Say or type an answer first.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save without feedback' }));
  expect(actions.onSave).toHaveBeenCalledOnce();
  rerender(<ReviewPanel answer={answer} feedbackEnabled online={false} limit={120} {...actions} />);
  expect(screen.getByRole('button', { name: 'Get feedback' })).toHaveAccessibleDescription(
    'You’re offline. Feedback needs a connection.',
  );
  fireEvent.keyDown(screen.getByLabelText('Your answer'), { key: 'Enter', ctrlKey: true });
  expect(actions.onSubmit).not.toHaveBeenCalled();
  rerender(<ReviewPanel answer={answer} feedbackEnabled online limit={120} {...actions} />);
  fireEvent.keyDown(screen.getByLabelText('Your answer'), { key: 'Enter', ctrlKey: true });
  expect(actions.onSubmit).toHaveBeenCalledOnce();
});
it('TC-039 CT-05 edits update counts, preserve raw input and enforce the character cap', () => {
  const actions = callbacks();
  const { rerender } = render(
    <ReviewPanel answer={answer} feedbackEnabled={false} online limit={120} {...actions} />,
  );
  const input = screen.getByLabelText('Your answer');
  expect(input).toHaveAttribute('maxlength', '4000');
  expect(input).toHaveAttribute('rows', '8');
  fireEvent.change(input, { target: { value: 'um improved delivery' } });
  expect(actions.onEdit).toHaveBeenCalledWith('um improved delivery');
  rerender(
    <ReviewPanel
      answer={{ ...answer, transcript: 'um improved delivery' }}
      feedbackEnabled={false}
      online
      limit={120}
      {...actions}
    />,
  );
  expect(screen.getByText('20 / 4,000')).toBeVisible();
  expect(screen.getByText('(um 1)')).toBeVisible();
  expect(answer.rawTranscript).toBe('I built a queue.');
  fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
  expect(actions.onSave).toHaveBeenCalledOnce();
});
it.each([
  ['time_limit', 'Time’s up. Recording stopped at 2 minutes.'],
  ['char_cap', 'Recording stopped at the 4,000-character limit.'],
  ['tab_hidden', 'Recording stopped because you left the tab.'],
  ['network', 'Speech recognition lost its connection. Your words so far are below.'],
  ['unexpected_stop', 'Recording stopped unexpectedly. Your words so far are below.'],
  ['restored', 'We restored your answer after the page reloaded.'],
] as const)('TC-039 CT-05 %s notice is announced after mount', (notice, copy) => {
  render(
    <ReviewPanel
      answer={{ ...answer, mode: 'voice', notice }}
      feedbackEnabled
      online
      limit={120}
      {...callbacks()}
    />,
  );
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  act(() => {
    vi.runOnlyPendingTimers();
  });
  expect(screen.getByRole('status')).toHaveTextContent(copy);
  expect(screen.getByRole('button', { name: 'Record again' })).toBeEnabled();
});
