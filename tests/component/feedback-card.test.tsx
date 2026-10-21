import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FeedbackCard } from '@/components/room/feedback-card';
import { answer, record as session } from '../fixtures/records';
import { feedbackLlm } from '../fixtures/feedback';

it('TC-077 CT-03 renders six accessible scores, flags, verified quotes and exact card sections', () => {
  const scored = {
    ...answer,
    feedback: {
      ...feedbackLlm(),
      overall: 4,
      flags: { too_short: true, off_topic: true, injection_suspected: true },
    },
    feedbackMeta: { model: 'mock', promptVersion: 'feedback-v1', latencyMs: 1234, costUsd: 0 },
  };
  const question = session.questions[0];
  if (!question) throw new Error('Missing fixture question');
  const { container } = render(<FeedbackCard answer={scored} question={question} />);
  expect(screen.getByRole('region', { name: 'Feedback on question 1' })).toBeVisible();
  expect(screen.getByText('Overall 4.0 / 4')).toBeVisible();
  for (const dimension of [
    'Structure',
    'Specificity',
    'Ownership',
    'Impact',
    'Relevance',
    'Clarity',
  ])
    expect(screen.getByText(`${dimension}: 4 out of 4`)).toHaveClass('sr-only');
  expect(container.querySelectorAll('[data-score-segment]')).toHaveLength(24);
  for (const bar of container.querySelectorAll('[data-score-bar]'))
    expect(bar).toHaveAttribute('aria-hidden', 'true');
  expect(
    screen.getByText(
      'Part of this answer looked like instructions to the grader. It was ignored for scoring.',
    ),
  ).toBeVisible();
  expect(
    screen.getByText(
      'This answer doesn’t seem to address the question, so most scores are capped at 2.',
    ),
  ).toBeVisible();
  expect(
    screen.getByText(
      'This answer is very short, so structure, specificity and impact are capped at 2.',
    ),
  ).toBeVisible();
  for (const title of [
    'Scores',
    'What worked',
    'What to improve',
    'A likely follow-up question',
    'Outline of a strong answer',
    'What interviewers listen for',
  ])
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
  expect(screen.getByText('I delivered the project')).toBeVisible();
  expect(screen.getByText('[constraint]')).toHaveClass('placeholder');
  expect(screen.getByText('Scored by mock · rubric feedback-v1 · 1.2 s')).toBeVisible();
  expect(container.querySelector('details')).not.toHaveAttribute('open');
  expect(
    within(container.querySelector('details')!).getByText(answer.transcript),
  ).toBeInTheDocument();
});
it('TC-077 CT-03 omitted evidence has no quote and false flags have no notes', () => {
  const question = session.questions[0]!;
  render(
    <FeedbackCard
      question={question}
      answer={{
        ...answer,
        feedback: {
          ...feedbackLlm(),
          overall: 4,
          strengths: [{ point: 'A clear contribution.', evidence: null }],
        },
      }}
    />,
  );
  expect(screen.queryByText('You said:')).not.toBeInTheDocument();
  expect(screen.queryByText(/Part of this answer looked/)).not.toBeInTheDocument();
});
