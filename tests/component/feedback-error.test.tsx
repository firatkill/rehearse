import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { FeedbackError } from '@/components/room/feedback-error';
import type { ErrorCode } from '@/lib/errors';
const cases: [ErrorCode, string, 'heading' | 'save' | 'retry'][] = [
  ['PROVIDER_ERROR', 'Feedback didn’t arrive', 'retry'],
  ['PROVIDER_TIMEOUT', 'Feedback didn’t arrive', 'retry'],
  ['FEEDBACK_INVALID', 'Feedback didn’t arrive', 'retry'],
  ['LIMITER_UNAVAILABLE', 'Feedback didn’t arrive', 'retry'],
  ['SESSION_FEEDBACK_EXHAUSTED', 'No feedback attempts left in this session', 'save'],
  ['FEEDBACK_QUOTA_EXCEEDED', 'You’ve reached today’s feedback limit', 'heading'],
  ['GLOBAL_CAP_REACHED', 'The demo has reached its daily limit', 'heading'],
  ['DEMO_READONLY', 'Feedback is paused on the live demo', 'heading'],
  ['TOKEN_EXPIRED', 'This session’s feedback window has closed', 'heading'],
  ['TOKEN_INVALID', 'Feedback isn’t available for this session', 'heading'],
  ['TOKEN_MISSING', 'Feedback isn’t available for this session', 'heading'],
  ['TOKEN_SCOPE', 'Feedback isn’t available for this session', 'heading'],
  ['INTERNAL_ERROR', 'Something went wrong on our side', 'retry'],
];
it.each(cases)(
  'TC-080 PRD §9.6 %s has exact heading, allowed actions and focus target',
  (code, title, focus) => {
    const onRetry = vi.fn();
    const onSave = vi.fn();
    const { container } = render(
      <FeedbackError
        code={code}
        requestId="12345678-private"
        retries={1}
        network={false}
        resetAt="2026-10-22T00:00:00.000Z"
        feedbackPerDay={20}
        globalPerDay={150}
        online
        onRetry={onRetry}
        onSave={onSave}
      />,
    );
    const heading = screen.getByRole('heading', { name: title });
    const save = screen.getByRole('button', { name: 'Save without feedback' });
    const retry = screen.queryByRole('button', { name: 'Try again' });
    expect(container.querySelector('[data-phase-focus]')).toBe(
      focus === 'heading' ? heading : focus === 'save' ? save : retry,
    );
    if (focus === 'retry') {
      expect(retry).toBeEnabled();
      fireEvent.click(retry!);
      expect(onRetry).toHaveBeenCalledOnce();
    } else expect(retry).toBeNull();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledOnce();
    if (code.startsWith('TOKEN_'))
      expect(screen.getByRole('link', { name: 'Start a new session' })).toHaveAttribute(
        'href',
        '/setup',
      );
    if (code === 'INTERNAL_ERROR') {
      expect(screen.getByText(/Reference 12345678\)/)).toBeVisible();
      expect(container.textContent).not.toContain('private');
    }
    if (code === 'FEEDBACK_QUOTA_EXCEEDED')
      expect(screen.getByText(/Each visitor can get 20 answers scored per day/)).toBeVisible();
    if (code === 'GLOBAL_CAP_REACHED')
      expect(screen.getByText(/Rehearse scores up to 150 answers a day/)).toBeVisible();
  },
);
it('TC-080 FR-26 offline retry is disabled and network copy stays distinct', () => {
  render(
    <FeedbackError
      code="INTERNAL_ERROR"
      requestId={null}
      retries={0}
      network
      resetAt={null}
      feedbackPerDay={20}
      globalPerDay={150}
      online={false}
      onRetry={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Connection lost' })).toBeVisible();
  expect(
    screen.getByText('Your answer is saved. Check your connection and try again.'),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save without feedback' })).toBeEnabled();
});
