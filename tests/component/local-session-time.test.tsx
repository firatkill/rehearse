import { I18nProvider } from '@/lib/i18n/context';
import { messages } from '@/messages/en-complete';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { LocalSessionTime } from '@/components/common/local-session-time';
it('TC-132 D-94 renders local dates only after mount', () => {
  const value = new Date(2026, 10, 6, 2, 30).toISOString();
  expect(
    renderToString(
      <I18nProvider initialLanguage="en" initialMessages={messages}>
        <LocalSessionTime value={value} />
      </I18nProvider>,
    ),
  ).not.toContain('Nov');
  render(<LocalSessionTime value={value} />);
  expect(screen.getByText('6 Nov 2026, 02:30')).toBeVisible();
  expect(screen.queryByText(/UTC/)).not.toBeInTheDocument();
});
