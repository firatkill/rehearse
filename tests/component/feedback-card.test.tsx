import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
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
    expect(screen.getByText(`${dimension}: 4 out of 4`)).toBeVisible();
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
  for (const title of ['Scores', 'Your answer, marked up', 'They’ll probably ask next'])
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
  for (const detail of container.querySelectorAll('details'))
    expect(detail).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('What worked', { exact: true }));
  expect(screen.getByText('I delivered the project')).toBeVisible();
  expect(screen.getAllByText('[constraint]')[0]).toHaveClass('placeholder');
  fireEvent.click(screen.getByText('How this was scored', { exact: true }));
  expect(screen.getByText('Scored by mock · rubric feedback-v1 · 1.2 s')).toBeVisible();
  expect(screen.getByText(answer.transcript)).toBeVisible();
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

it('TC-148 V-21 puts the targeted rewrite and retry before the marked answer and collapsed details', () => {
  const retry = vi.fn();
  const value = { ...feedbackLlm(), overall: 4 };
  const { container } = render(
    <FeedbackCard
      answer={{ ...answer, feedback: value }}
      question={session.questions[0]!}
      onRetry={retry}
      previous={value}
    />,
  );
  const sections = [...container.querySelectorAll('.feedback-main > section')].map((node) =>
    node.getAttribute('aria-label'),
  );
  expect(sections).toEqual(['Change one thing', 'Your answer, marked up', 'Follow-up question']);
  expect(screen.getByRole('heading', { name: 'Change one thing · Structure' })).toBeVisible();
  const button = screen.getByRole('button', { name: 'Try again with this' });
  expect(button.closest('section')).toHaveAttribute('aria-label', 'Change one thing');
  fireEvent.click(button);
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.getByText('Change from previous attempt')).toBeVisible();
  expect(screen.getAllByText('Not measured in text mode').length).toBeGreaterThan(0);
});
it.each([
  [30000, 'Too short'],
  [60000, 'On target'],
  [120000, 'On target'],
  [120001, 'Long'],
  [null, 'Not available'],
] as const)('TC-148 V-21 voice length %s gives %s', (recordingMs, verdict) => {
  render(
    <FeedbackCard
      answer={{
        ...answer,
        mode: 'voice',
        timing: { ...answer.timing, recordingMs },
        feedback: { ...feedbackLlm(), overall: 4 },
      }}
      question={session.questions[0]!}
    />,
  );
  const label = screen.getByText('Length');
  expect(label.nextElementSibling).toHaveTextContent(verdict);
});
it('TC-148 V-21 historic feedback never invents a targeted rewrite and absent feedback renders nothing', () => {
  const raw = feedbackLlm();
  const { container, rerender } = render(
    <FeedbackCard answer={{ ...answer, feedback: null }} question={session.questions[0]!} />,
  );
  expect(container).toBeEmptyDOMElement();
  rerender(
    <FeedbackCard
      answer={{
        ...answer,
        feedback: {
          ...raw,
          overall: 4,
          improvements: raw.improvements.map(({ point, why, rewrite }) => ({
            point,
            why,
            rewrite,
          })),
        },
      }}
      question={session.questions[0]!}
    />,
  );
  expect(
    screen.getByText(
      'This older feedback has no targeted rewrite. Use the guidance above and try again.',
    ),
  ).toBeVisible();
});
