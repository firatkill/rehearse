import { T } from '@/lib/i18n/context';
import { demoJobs } from '@/lib/demo/content';
import type { Metadata } from 'next';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { getEnv } from '@/lib/env';
import { SetupForm } from '@/components/setup/setup-form';

export const metadata: Metadata = { title: 'Set up a session · Rehearse' };
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string | string[]; demoJob?: string }>;
}) {
  const env = getEnv();
  const query = await searchParams;
  return (
    <div className="setup-page">
      <h1>
        <T id="app.setup.page.1" />
      </h1>
      <p>
        <T id="app.setup.page.2" />
      </p>
      {env.DEMO_MODE === 'off' ? (
        <section className="space-y-4">
          <h2>
            <T id="app.setup.page.3" />
          </h2>
          <p>
            <T id="app.setup.page.4" />
          </p>
          <div className="flex gap-4">
            <Link href="/sample">
              <T id="components.layout.banners.2" />
            </Link>
            <Link href="/progress">
              <T id="app.setup.page.6" />
            </Link>
          </div>
        </section>
      ) : (
        <SetupForm
          {...(env.APP_EDITION === 'demo' && demoJobs.some((job) => job.slug === query.demoJob)
            ? { demoJob: query.demoJob }
            : {})}
          demoMode={env.DEMO_MODE}
          sessionsPerDay={env.RATE_LIMIT_SESSIONS_PER_IP_DAILY}
          initialSeed={
            typeof query.seed === 'string'
              ? query.seed
              : Array.isArray(query.seed)
                ? (query.seed[0] ?? null)
                : null
          }
        />
      )}
    </div>
  );
}
