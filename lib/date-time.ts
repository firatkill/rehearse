import { DATE_TIME, LANGUAGE_LOCALES, type Language } from '@/lib/config';

const sessionDate = new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
  dateStyle: 'medium',
  timeZone: DATE_TIME.SESSION_TIME_ZONE,
});
/** Only the public sample uses a timezone fixed across server rendering and hydration. */
export function formatSessionDate(value: string | Date, language: Language = 'en'): string {
  return language === 'en'
    ? sessionDate.format(new Date(value))
    : new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
        dateStyle: 'medium',
        timeZone: DATE_TIME.SESSION_TIME_ZONE,
      }).format(new Date(value));
}

export function formatSessionTimestamp(value: string | Date, language: Language = 'en'): string {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Quota copy promises the visitor's local reset time, not a saved-session date. */
export function formatLocalTime(value: string | Date, language: Language = 'en'): string {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
