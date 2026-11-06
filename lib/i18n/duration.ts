import type { MessageKey, MessageValues } from './messages';
export function durationWords(
  seconds: number,
  t: (key: MessageKey, values?: MessageValues) => string,
): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0)
    return t(minutes === 1 ? 'duration.minute' : 'duration.minutes', { count: minutes });
  if (seconds < 120) return t('duration.seconds', { count: seconds });
  return t('duration.mixed', { minutes, seconds: remainder });
}
