import Link from 'next/link';
import type { UpcomingItem } from '@/lib/api/upcoming-contracts';
import { upcomingInterview } from '@/lib/report/upcoming';
import { SafeText } from '@/components/common/safe-text';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Button } from '@/components/ui/button';
export function ComingUp({ posts, now }: { posts: UpcomingItem[]; now: Date }) {
  const post = upcomingInterview(posts, now);
  if (!post) return null;
  const remaining = post.total - post.answered;
  return (
    <section className="progress-card coming-up" aria-labelledby="coming-up-heading">
      <div className="space-y-2">
        <Eyebrow>
          Coming up ·{' '}
          {post.days === 0 ? 'today' : `in ${post.days} ${post.days === 1 ? 'day' : 'days'}`}
        </Eyebrow>
        <h2 id="coming-up-heading">
          <SafeText
            text={
              post.company && post.role
                ? `${post.company} · ${post.role}`
                : post.role || post.company || 'Job-post interview'
            }
          />
        </h2>
        <p>
          {post.total === 0
            ? 'No questions yet. Open the post to generate questions.'
            : `You’ve practised ${post.answered} of ${post.total} questions from this post. ${remaining === 0 ? 'You’ve answered every question.' : `${remaining} ${remaining === 1 ? 'has' : 'have'} never been answered.`}`}
        </p>
      </div>
      <Button asChild>
        <Link href={`/job/${post.id}`}>Open questions</Link>
      </Button>
    </section>
  );
}
