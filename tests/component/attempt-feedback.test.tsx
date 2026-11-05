import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AttemptFeedback } from '@/components/room/attempt-feedback';
import { completeAttempt } from '@/lib/storage/attempts';
import { answer, record } from '../fixtures/records';
import { feedback } from '../fixtures/api';

test('TC-146 attempt tabs preserve answer text and support keyboard comparison', () => {
  const first = completeAttempt({
    ...answer,
    status: 'scored',
    feedback,
    transcript: 'First response.',
  });
  const second = completeAttempt({
    ...first,
    transcript: 'Improved response.',
    feedback: {
      ...feedback,
      scores: { ...feedback.scores, impact: { ...feedback.scores.impact, score: 4 } },
    },
  });
  const question = record.questions[0];
  if (!question) throw new Error('Question fixture missing');
  const retry = vi.fn();
  render(<AttemptFeedback answer={second} question={question} onRetry={retry} />);
  expect(screen.getByRole('tab', { name: 'Attempt 2' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Change from previous attempt')).toBeVisible();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Attempt 2' }), { key: 'ArrowLeft' });
  expect(screen.getByRole('tab', { name: 'Attempt 1' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'Attempt 1' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('First response.')).toBeInTheDocument();
  expect(screen.queryByText('Change from previous attempt')).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Attempt 1' }), { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Attempt 2' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Try again with this' }));
  expect(retry).toHaveBeenCalledOnce();
});

test('TC-149 follow-up tabs retain their parent action and never offer recursive follow-ups', () => {
  const main = completeAttempt({
    ...answer,
    status: 'scored' as const,
    feedback,
    feedbackMeta: {
      model: 'mock',
      promptVersion: 'v7',
      latencyMs: 1,
      costUsd: 0,
      followUpToken: 'proof',
    },
  });
  const parent = main.attemptRecords[0]!;
  const followUp = completeAttempt({
    ...main,
    transcript: 'I measured the result.',
    followUp: { parentAttemptId: parent.id, prompt: feedback.follow_up_question, token: 'proof' },
    feedbackMeta: { ...main.feedbackMeta, followUpToken: null },
  });
  const start = vi.fn();
  render(
    <AttemptFeedback
      answer={followUp}
      question={record.questions[0]!}
      onRetry={vi.fn()}
      onFollowUp={start}
    />,
  );
  expect(screen.getByRole('tab', { name: 'Follow-up 1' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('button', { name: 'Answer follow-up' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Try again with this' })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Follow-up 1' }), { key: 'Home' });
  fireEvent.click(screen.getByRole('button', { name: 'Answer follow-up' }));
  expect(start).toHaveBeenCalledWith(parent.id);
});
