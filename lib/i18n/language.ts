import { LANGUAGES, type Language } from '@/lib/config';
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some((language) => language === value);
}
export function languageOf(value: unknown): Language {
  return isLanguage(value) ? value : 'en';
}
export function languageHref(href: string, language: Language): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'http://rehearse.local');
  if (language === 'tr') url.searchParams.set('language', language);
  else url.searchParams.delete('language');
  return `${url.pathname}${url.search}${url.hash}`;
}
