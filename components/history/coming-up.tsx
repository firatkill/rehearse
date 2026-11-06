'use client';
import { T, useT } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
import type { UpcomingItem } from '@/lib/api/upcoming-contracts';
import { upcomingInterview } from '@/lib/report/upcoming';
import { SafeText } from '@/components/common/safe-text';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Button } from '@/components/ui/button';
export function ComingUp({ posts, now }: { posts: UpcomingItem[]; now: Date }) {
  const t = useT();

  const post = upcomingInterview(posts, now);
  if (!post) return null;
  const remaining = post.total - post.answered;
  return (
    <section className="progress-card coming-up" aria-labelledby="coming-up-heading">
      <div className="space-y-2">
        <Eyebrow>
          <T id="components.history.coming.up.1" />{' '}
          {post.days === 0
            ? t('common.today')
            : t('ui.template.0', {
                v0: post.days,
                v1: t(post.days === 1 ? 'common.day' : 'common.days'),
              })}
        </Eyebrow>
        <h2 id="coming-up-heading">
          <SafeText
            text={
              post.company && post.role
                ? `${post.company} · ${post.role}`
                : post.role || post.company || t('ui.dynamic.1')
            }
          />
        </h2>
        <p>
          {post.total === 0
            ? t('ui.dynamic.2')
            : t('ui.template.1', {
                v0: post.answered,
                v1: post.total,
                v2:
                  remaining === 0
                    ? t('ui.dynamic.3')
                    : t(remaining === 1 ? 'upcoming.unanswered.one' : 'upcoming.unanswered.many', {
                        count: remaining,
                      }),
              })}
        </p>
      </div>
      <Button asChild>
        <Link href={`/job/${post.id}`}>
          <T id="components.history.coming.up.2" />
        </Link>
      </Button>
    </section>
  );
}
