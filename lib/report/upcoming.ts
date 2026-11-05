import { JOBPOST } from '@/lib/config';
import type { UpcomingItem } from '@/lib/api/upcoming-contracts';
/** Compare local calendar dates via UTC ordinals, so DST never changes the day count. */
export function upcomingInterview(posts: UpcomingItem[], now: Date) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return (
    posts
      .map((post) => ({
        ...post,
        days: Math.round(
          (Date.parse(`${post.interviewDate}T00:00:00Z`) - today) / JOBPOST.CALENDAR_DAY_MS,
        ),
      }))
      .filter((post) => post.days >= 0)
      .sort((a, b) => a.days - b.days || a.id.localeCompare(b.id))[0] ?? null
  );
}
