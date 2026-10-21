import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReportView } from '@/components/report/report-view';
import { record, answer } from '../fixtures/records';
import { feedbackLlm } from '../fixtures/feedback';
import { DIMENSION_TIPS } from '@/lib/feedback/rubric';
const scored = { ...answer, status: 'scored' as const, feedback: { ...feedbackLlm(), overall: 4 } };
it('TC-084 CT-07 local numbers and focus tips remain available without a summary', () => {
  const { container } = render(
    <ReportView session={record} answers={[scored, { ...answer, index: 1, status: 'skipped' }]} />,
  );
  expect(screen.getByText('4.0 / 4 average')).toBeVisible();
  expect(screen.getByText('Best: Question 1 (4.0) · Lowest: Question 1 (4.0)')).toBeVisible();
  expect(screen.getByText(DIMENSION_TIPS.structure)).toBeVisible();
  expect(screen.getByRole('table', { name: 'Scores by question and dimension' })).toBeVisible();
  expect(container.querySelector('svg')).toBeNull();
  expect(screen.getByText('This session isn’t finished.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  const row = screen.getByRole('rowheader', { name: 'Structure' }).closest('tr')!;
  expect(
    within(row)
      .getAllByRole('cell')
      .map((c) => c.textContent),
  ).toEqual(['4', '—', '—', '4.0']);
});
it('TC-084 CT-07 multiple scores show an inaccessible decorative chart; no scores show the exact fallback', () => {
  const { container, rerender } = render(
    <ReportView
      session={{ ...record, status: 'completed' }}
      answers={[scored, { ...scored, index: 2 }]}
    />,
  );
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false');
  expect(container.querySelector('svg')).not.toHaveAttribute('role');
  expect(container.querySelectorAll('polyline')).toHaveLength(2);
  rerender(<ReportView session={record} answers={[answer]} />);
  expect(screen.getByText('No answers were scored in this session.')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Focus on these next' })).toBeNull();
});
it('TC-085 CT-07 summary loading, failed retry and literal summary states', () => {
  const retry = vi.fn();
  const { rerender } = render(<ReportView session={record} answers={[scored]} summaryLoading />);
  expect(screen.getByText('Writing your summary…')).toBeVisible();
  rerender(<ReportView session={record} answers={[scored]} onRetry={retry} />);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
  rerender(
    <ReportView
      session={{
        ...record,
        summary: {
          headline: '<b>Literal</b>',
          paragraph: 'A safe summary.',
          focus_notes: [],
          next_practice: 'Try a shorter opening.',
          generated_at: record.createdAt,
          model: 'mock',
          prompt_version: 'summary-v1',
        },
      }}
      answers={[scored]}
    />,
  );
  expect(screen.getByText('<b>Literal</b>')).toBeVisible();
  expect(screen.getByText('Written by the language model from your scores.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Next practice' })).toBeVisible();
});
it('TC-086 CT-07 print expands all disclosures and restores their previous states', () => {
  const { container } = render(<ReportView session={record} answers={[scored]} />);
  const details = Array.from(container.querySelectorAll('details'));
  details[0]!.open = true;
  const prior = details.map((d) => d.open);
  act(() => {
    window.dispatchEvent(new Event('beforeprint'));
  });
  expect(details.every((d) => d.open)).toBe(true);
  act(() => {
    window.dispatchEvent(new Event('beforeprint'));
    window.dispatchEvent(new Event('afterprint'));
  });
  expect(details.map((d) => d.open)).toEqual(prior);
  expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toHaveAttribute(
    'data-print',
    'hide',
  );
});
it('TC-086 CT-07 downloads Markdown with a revoked URL and prefills repeat setup', () => {
  const create = vi.fn(() => 'blob:test');
  const revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = create;
      static override revokeObjectURL = revoke;
    },
  );
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<ReportView session={record} answers={[answer]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Download Markdown' }));
  expect(create).toHaveBeenCalledWith(expect.any(Blob));
  expect(revoke).toHaveBeenCalledWith('blob:test');
  expect(click).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('link', { name: 'Practise again with the same questions' }));
  expect(localStorage.getItem('rehearse-setup')).toBe(JSON.stringify(record.setup));
  click.mockRestore();
});
