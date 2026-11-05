import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ComingUp } from '@/components/history/coming-up';
import { JobPost } from '@/components/jobpost/job-post';
import { requestJob } from '@/lib/api/jobpost-client';
import { upcomingInterview } from '@/lib/report/upcoming';
import { jobRecord } from '../fixtures/job-record';
beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
const mocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks }));
vi.mock('@/hooks/use-repository', () => ({ useRepository: () => ({}) }));
vi.mock('@/hooks/use-capabilities', () => ({ useCapabilities: () => null }));
vi.mock('@/lib/api/jobpost-client', () => ({ requestJob: vi.fn() }));
const post = {
  id: jobRecord.post.id,
  company: 'Fictional Co',
  role: 'Engineer',
  interviewDate: '2026-11-11',
  total: 8,
  answered: 6,
};
it('TC-182 shows nearest upcoming interview, calendar days and distinct unanswered count', () => {
  render(
    <ComingUp
      posts={[
        { ...post, interviewDate: '2026-11-03' },
        post,
        { ...post, id: 'dfa89a6e-9e68-44f9-a6c7-0b742a20c013', interviewDate: '2026-11-12' },
      ]}
      now={new Date(2026, 10, 5, 23, 59)}
    />,
  );
  expect(screen.getByText('Coming up · in 6 days')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Fictional Co · Engineer' })).toBeVisible();
  expect(
    screen.getByText(
      'You’ve practised 6 of 8 questions from this post. 2 have never been answered.',
    ),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open questions' })).toHaveAttribute(
    'href',
    `/job/${post.id}`,
  );
});
it.each([{ posts: [] }, { posts: [{ ...post, interviewDate: '2026-11-04' }] }])(
  'TC-182 no card for absent or past dates',
  ({ posts }) => {
    const { container } = render(<ComingUp posts={posts} now={new Date(2026, 10, 5)} />);
    expect(container).toBeEmptyDOMElement();
  },
);
it('TC-182 today, tomorrow, zero questions and all answered states are honest', () => {
  const { rerender } = render(<ComingUp posts={[post]} now={new Date(2026, 10, 11)} />);
  expect(screen.getByText('Coming up · today')).toBeVisible();
  rerender(<ComingUp posts={[{ ...post, answered: 7 }]} now={new Date(2026, 10, 10, 23, 59)} />);
  expect(screen.getByText('Coming up · in 1 day')).toBeVisible();
  expect(screen.getByText(/1 has never been answered/)).toBeVisible();
  rerender(<ComingUp posts={[{ ...post, answered: 8 }]} now={new Date(2026, 10, 10)} />);
  expect(screen.getByText(/You’ve answered every question/)).toBeVisible();
  rerender(<ComingUp posts={[{ ...post, total: 0, answered: 0 }]} now={new Date(2026, 10, 10)} />);
  expect(screen.getByText('No questions yet. Open the post to generate questions.')).toBeVisible();
  expect(
    upcomingInterview([{ ...post, interviewDate: '2026-03-09' }], new Date(2026, 2, 7, 23, 59))
      ?.days,
  ).toBe(2);
});
it('TC-182 date form saves and clears through the data API without generation', async () => {
  vi.mocked(requestJob).mockImplementation(async (request) => {
    await Promise.resolve();
    if (request.operation !== 'setInterviewDate') throw new Error('Unexpected operation');
    return {
      ok: true,
      data: { ...jobRecord, post: { ...jobRecord.post, interviewDate: request.interviewDate } },
    };
  });
  render(<JobPost initial={jobRecord} />);
  expect(screen.getByRole('button', { name: 'Save date' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Interview date', { selector: 'input' }), {
    target: { value: '2026-11-11' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save date' }));
  await waitFor(() => expect(screen.getByText('Interview date saved.')).toBeVisible());
  expect(requestJob).toHaveBeenCalledWith({
    operation: 'setInterviewDate',
    id: post.id,
    interviewDate: '2026-11-11',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
  await waitFor(() => expect(screen.getByText('Interview date cleared.')).toBeVisible());
  expect(screen.getByLabelText('Interview date', { selector: 'input' })).toHaveValue('');
  expect(requestJob).toHaveBeenLastCalledWith({
    operation: 'setInterviewDate',
    id: post.id,
    interviewDate: null,
  });
});
it('TC-182 a failed save preserves the date for retry and reports the error', async () => {
  vi.mocked(requestJob).mockResolvedValue({
    ok: false,
    message: 'Couldn’t reach Rehearse. Check your connection and try again.',
  });
  render(<JobPost initial={jobRecord} />);
  fireEvent.change(screen.getByLabelText('Interview date', { selector: 'input' }), {
    target: { value: '2026-11-11' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save date' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t reach Rehearse.'),
  );
  expect(screen.getByLabelText('Interview date', { selector: 'input' })).toHaveValue('2026-11-11');
  expect(screen.getByRole('button', { name: 'Save date' })).toBeEnabled();
});
