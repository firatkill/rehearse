import { DATE_TIME } from '@/lib/config';

const sessionDate = new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
  dateStyle: 'medium',
  timeZone: DATE_TIME.SESSION_TIME_ZONE,
});
/** Only the public sample uses a timezone fixed across server rendering and hydration. */
export function formatSessionDate(value: string | Date): string {
  return sessionDate.format(new Date(value));
}

export function formatSessionTimestamp(value: string | Date): string {
  return new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Quota copy promises the visitor's local reset time, not a saved-session date. */
export function formatLocalTime(value: string | Date): string {
  return new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
