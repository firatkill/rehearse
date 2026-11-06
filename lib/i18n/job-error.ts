import { JOBPOST_ERROR_COPY } from '@/lib/api/jobpost-contracts';
import type { MessageKey, MessageValues } from './messages';
/** Transport messages are fixed repository copy, not provider text. */
export function jobErrorMessage(
  message: string,
  t: (key: MessageKey, values?: MessageValues) => string,
) {
  const code =
    (Object.keys(JOBPOST_ERROR_COPY) as (keyof typeof JOBPOST_ERROR_COPY)[]).find(
      (key) => JOBPOST_ERROR_COPY[key] === message,
    ) ?? 'NETWORK';
  return t(`job.error.${code}`);
}
