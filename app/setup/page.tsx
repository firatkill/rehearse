import type { Metadata } from 'next';
import Link from 'next/link';
import { getEnv } from '@/lib/env';
import { SetupForm } from '@/components/setup/setup-form';

export const metadata: Metadata = { title: 'Set up a session · Rehearse' };
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string | string[] }>;
}) {
  const env = getEnv();
  const query = await searchParams;
  return (
    <div className="space-y-4 py-8">
      <h1>Set up a practice session</h1>
      <p>Choose what you want to practise. You can change the voice and speed at any time.</p>
      {env.DEMO_MODE === 'off' ? (
        <section className="space-y-4">
          <h2>The practice room is offline for maintenance</h2>
          <p>You can still read the sample report and your saved sessions.</p>
          <div className="flex gap-4">
            <Link href="/sample">See the sample report</Link>
            <Link href="/history">Open history</Link>
          </div>
        </section>
      ) : (
        <SetupForm
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
