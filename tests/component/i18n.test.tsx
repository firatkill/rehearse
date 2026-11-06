import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nProvider, T, useI18n, useSessionLanguage } from '@/lib/i18n/context';
import { LanguageLink } from '@/lib/i18n/link';
import { messages as en } from '@/messages/en-complete';
import { messages as tr } from '@/messages/tr';
import type { Language } from '@/lib/config';

function Controls({ sessionLanguage }: { sessionLanguage?: Language }) {
  const { selectLanguage } = useI18n();
  useSessionLanguage(sessionLanguage);
  return (
    <>
      <T id="language.label" />
      <button
        onClick={() => {
          void selectLanguage('tr');
        }}
      >
        Turkish
      </button>
      <button
        onClick={() => {
          void selectLanguage('en');
        }}
      >
        English
      </button>
      <LanguageLink href="/setup?seed=1234abcd">Setup</LanguageLink>
    </>
  );
}
afterEach(() => {
  localStorage.clear();
});
it('TC-204 V-60 ignores browser locale, changes only on choice and preserves explicit navigation', async () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('tr-TR');
  render(
    <I18nProvider initialLanguage="en" initialMessages={en}>
      <Controls />
    </I18nProvider>,
  );
  expect(screen.getByText('Language')).toBeVisible();
  expect(document.documentElement.lang).toBe('en');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Turkish' }));
    await import('@/messages/tr');
  });
  expect(screen.getByText('Dil')).toBeVisible();
  expect(document.documentElement.lang).toBe('tr');
  expect(localStorage.getItem('rehearse-language')).toBe('tr');
  expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute(
    'href',
    '/setup?seed=1234abcd&language=tr',
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    await import('@/messages/en-complete');
  });
  expect(screen.getByText('Language')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute(
    'href',
    '/setup?seed=1234abcd',
  );
});
it('TC-205 V-60 a saved English session overrides Turkish UI without replacing the setup preference', async () => {
  localStorage.setItem('rehearse-language', 'tr');
  await act(async () => {
    render(
      <I18nProvider initialLanguage="tr" initialMessages={tr}>
        <Controls sessionLanguage="en" />
      </I18nProvider>,
    );
    await import('@/messages/en-complete');
  });
  expect(screen.getByText('Language')).toBeVisible();
  expect(localStorage.getItem('rehearse-language')).toBe('tr');
});
it('TC-204 V-60 interpolated values remain literal text', () => {
  // The shared test wrapper deliberately supplies the production provider; its normal
  // rendering is covered above. Catalogue interpolation remains React text, never HTML.
  render(
    <I18nProvider initialLanguage="tr" initialMessages={tr}>
      <T id="ui.template.31" values={{ v0: '<script>unsafe</script>', v1: 5 }} />
    </I18nProvider>,
  );
  expect(screen.getByText('Soru <script>unsafe</script> / 5 · Rehearse')).toBeVisible();
  expect(document.querySelector('script')).toBeNull();
});
