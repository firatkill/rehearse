import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SetupForm } from '@/components/setup/setup-form';
import { startSession } from '@/lib/api/client';
import { record } from '../fixtures/records';
import type { StartResponse } from '@/lib/api/contracts';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createSession: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/use-repository', () => ({
  useRepository: () => ({ createSession: mocks.createSession }),
}));
vi.mock('@/lib/api/client', () => ({ startSession: vi.fn() }));
const response: StartResponse = {
  sessionId: record.id,
  seed: record.seed,
  bankVersion: record.bankVersion,
  questions: record.questions,
  token: null,
  tokenExpiresAt: null,
  feedback: { enabled: false, reason: 'practice' },
  limits: { sessionsPerDay: 3, feedbackPerDay: 20, globalDaily: 150 },
  demoMode: 'on',
};
beforeEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  vi.clearAllMocks();
});
function show(seed: string | null = null, mode: 'on' | 'readonly' = 'on') {
  return render(<SetupForm demoMode={mode} sessionsPerDay={3} initialSeed={seed} />);
}
it('TC-033 CT-01 shows defaults, saves preferences and focuses missing question types', () => {
  show();
  expect(screen.getByLabelText('Full-stack')).toBeChecked();
  expect(screen.getByLabelText('Mid-level')).toBeChecked();
  expect(screen.getByLabelText('3 questions (about 10 minutes)')).toBeChecked();
  expect(screen.getByLabelText('Voice: answer out loud')).toBeChecked();
  fireEvent.click(screen.getByLabelText('Backend'));
  fireEvent.click(screen.getByLabelText('Text: type your answers'));
  expect(localStorage.getItem('rehearse-setup')).toContain('backend');
  fireEvent.click(screen.getByLabelText('Behavioral'));
  fireEvent.click(screen.getByLabelText('Technical concepts'));
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one question type.');
  expect(screen.getByLabelText('Behavioral')).toHaveFocus();
  expect(startSession).not.toHaveBeenCalled();
});
it('TC-033 CT-01 honours a seed and creates the session before navigating', async () => {
  vi.mocked(startSession).mockResolvedValue({ ok: true, data: response });
  show('0000abcd');
  expect(
    screen.getByText(
      'Using seed 0000abcd. You’ll get the same questions as the session that used it.',
    ),
  ).toBeVisible();
  fireEvent.click(screen.getByLabelText('Text: type your answers'));
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
  await waitFor(() => {
    expect(mocks.push).toHaveBeenCalledWith(`/session/${record.id}`);
  });
  expect(startSession).toHaveBeenCalledWith({
    role: 'full-stack',
    seniority: 'mid',
    types: ['behavioral', 'technical-concepts'],
    length: 3,
    mode: 'text',
    seed: '0000abcd',
    feedback: true,
  });
  expect(mocks.createSession.mock.calls[0]?.[0]).toMatchObject({
    id: record.id,
    status: 'in_progress',
    currentMode: 'text',
    checkpoint: { index: 0, phase: 'intro' },
  });
});
it('TC-033 CT-01 drops an invalid seed and uses readonly button copy', async () => {
  vi.mocked(startSession).mockResolvedValue({ ok: false, kind: 'network' });
  show('xyz', 'readonly');
  expect(screen.getByText('That seed isn’t valid, so a new one will be used.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Start session without feedback' }));
  await screen.findByRole('alert');
  expect(vi.mocked(startSession).mock.calls[0]?.[0]).not.toHaveProperty('seed');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Couldn’t start the session. Check your connection and try again.',
  );
});
it.each([
  ['SESSION_QUOTA_EXCEEDED', 'quota', 'You’ve used today’s feedback sessions'],
  ['LIMITER_UNAVAILABLE', 'limiter_unavailable', 'Feedback is unavailable right now'],
] as const)('TC-034 CT-01 %s offers practice without feedback', async (code, reason, heading) => {
  vi.mocked(startSession)
    .mockResolvedValueOnce({
      ok: false,
      kind: 'http',
      status: code === 'LIMITER_UNAVAILABLE' ? 503 : 429,
      error: { code, message: code, requestId: 'request-123', resetAt: '2026-10-22T00:00:00.000Z' },
    })
    .mockResolvedValueOnce({ ok: true, data: response });
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
  const h = await screen.findByRole('heading', { name: heading });
  expect(h).toHaveFocus();
  if (reason === 'quota')
    expect(screen.getByRole('link', { name: 'See the sample report' })).toHaveAttribute(
      'href',
      '/sample',
    );
  else expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Practise without feedback' }));
  await waitFor(() => {
    expect(mocks.push).toHaveBeenCalled();
  });
  expect(vi.mocked(startSession).mock.calls[1]?.[0].feedback).toBe(false);
  expect(mocks.createSession.mock.calls[0]?.[0]).toMatchObject({
    feedback: { enabled: false, reason },
  });
});
