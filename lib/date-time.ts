import { DATE_TIME } from '@/lib/config';

const sessionDate = new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
  dateStyle: 'medium',
  timeZone: DATE_TIME.SESSION_TIME_ZONE,
});
const sessionTimestamp = new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: DATE_TIME.SESSION_TIME_ZONE,
});

/** Saved session dates must agree during server rendering and browser hydration. */
export function formatSessionDate(value: string | Date): string {
  return sessionDate.format(new Date(value));
}

export function formatSessionTimestamp(value: string | Date): string {
  return `${sessionTimestamp.format(new Date(value))} ${DATE_TIME.SESSION_TIME_ZONE}`;
}

/** Quota copy promises the visitor's local reset time, not a saved-session date. */
export function formatLocalTime(value: string | Date): string {
  return new Intl.DateTimeFormat(DATE_TIME.LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
