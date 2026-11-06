import { LANGUAGE_LOCALES, type Language } from '@/lib/config';
/** Preserve each English call site's original representation; Turkish uses explicit Intl rules. */
export function formatNumber(value: number, language: Language, digits?: number): string {
  if (language === 'en') return digits === undefined ? String(value) : value.toFixed(digits);
  return new Intl.NumberFormat(LANGUAGE_LOCALES.tr, {
    ...(digits === undefined
      ? {}
      : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  }).format(value);
}
export function formatCount(value: number, language: Language): string {
  return new Intl.NumberFormat(LANGUAGE_LOCALES[language]).format(value);
}
