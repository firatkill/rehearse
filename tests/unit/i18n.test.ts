import { expect, it } from 'vitest';
import { messages as en } from '@/messages/en-complete';
import { messages as tr } from '@/messages/tr';
import { formatMessage, loadMessages, type MessageKey } from '@/lib/i18n/messages';
import { isLanguage, languageHref, languageOf } from '@/lib/i18n/language';

it('TC-204 V-60 catalogues have identical typed keys and interpolation parameters', async () => {
  expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as MessageKey[]) {
    expect(tr[key].trim(), key).not.toBe('');
    const parameters = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    expect(parameters(tr[key]), key).toEqual(parameters(en[key]));
  }
  expect(await loadMessages('en')).toEqual(en);
  expect(await loadMessages('tr')).toEqual(tr);
  expect(formatMessage(en, 'ui.template.31', { v0: 2, v1: 5 })).toBe('Question 2 of 5 · Rehearse');
  expect(formatMessage(tr, 'ui.template.31', { v0: 2, v1: 5 })).toBe('Soru 2 / 5 · Rehearse');
  expect(formatMessage(en, 'ui.template.31', { v0: 2 })).toContain('{v1}');
});
it('TC-204 V-60 explicit language URLs retain query/hash and never rewrite external destinations', () => {
  expect(languageHref('/setup?seed=1234abcd#options', 'tr')).toBe(
    '/setup?seed=1234abcd&language=tr#options',
  );
  expect(languageHref('/setup?language=tr&seed=1234abcd', 'en')).toBe('/setup?seed=1234abcd');
  for (const href of ['https://example.com', '//example.com', '#details', 'mailto:a@example.com'])
    expect(languageHref(href, 'tr')).toBe(href);
  expect(languageOf('tr')).toBe('tr');
  for (const value of [null, undefined, 'tr-TR', 'fr', 'TR']) {
    expect(isLanguage(value)).toBe(false);
    expect(languageOf(value)).toBe('en');
  }
});
