import { describe, expect, it } from 'vitest';
import { formatLocalTime, formatSessionDate, formatSessionTimestamp } from '@/lib/date-time';

describe('TC-123 V-01 shared British date/time formatting', () => {
  it.each(['2026-11-05T00:30:00.000Z', '2026-11-05T23:30:00.000Z'])(
    'keeps the saved UTC calendar day at %s',
    (timestamp) => {
      expect(formatSessionDate(timestamp)).toBe('5 Nov 2026');
      expect(formatSessionDate(new Date(timestamp))).toBe('5 Nov 2026');
    },
  );
  it('labels the saved timestamp timezone and uses the British 24-hour clock', () => {
    expect(formatSessionTimestamp('2026-11-05T23:30:00.000Z')).toBe('5 Nov 2026, 23:30 UTC');
  });
  it('keeps quota reset times local while using a 24-hour clock', () => {
    const localDate = new Date(2026, 10, 5, 16, 9);
    expect(formatLocalTime(localDate)).toBe('16:09');
  });
});
