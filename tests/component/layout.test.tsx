import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Banners } from '@/components/layout/banners';
import { Header } from '@/components/layout/header';
import ErrorPage from '@/app/error';

it('TC-015 PRD 9.2 renders empty status containers on the server, then banner copy in order', () => {
  const html = renderToString(<Banners demoMode="readonly" notSaving updatedElsewhere blocked />);
  expect(html).not.toContain('Feedback is paused');
  render(<Banners demoMode="readonly" notSaving updatedElsewhere blocked />);
  const statuses = screen.getAllByRole('status');
  expect(statuses[0]).toHaveTextContent('Feedback is paused on the live demo.');
  expect(statuses[3]).toHaveTextContent('This browser isn’t saving sessions');
  expect(statuses[4]).toHaveTextContent('Rehearse was updated in another tab.');
  expect(statuses[5]).toHaveTextContent('Close other Rehearse tabs, then reload this page.');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
  expect(statuses[2]).toHaveTextContent(
    'You’re offline. You can keep answering; feedback needs a connection.',
  );
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
  expect(statuses[2]).toBeEmptyDOMElement();
});

it('TC-014 PRD 9.1 room header contains only wordmark and end-session slot', () => {
  render(<Header room endSession={<button>End session</button>} />);
  expect(screen.getByRole('link', { name: 'Rehearse' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: 'End session' })).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

it('TC-015 PRD 9.13 error boundary renders exact recovery copy', () => {
  render(<ErrorPage />);
  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  expect(
    screen.getByText('The page hit an error. Your saved sessions are safe in this browser.'),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Reload the page' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
});
