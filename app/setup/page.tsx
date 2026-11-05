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
    <div className="setup-page">
      <h1>What are you preparing for?</h1>
      <p>Pick one. You can change the voice, speed and length before you start.</p>
      {env.DEMO_MODE === 'off' ? (
        <section className="space-y-4">
          <h2>The practice room is offline for maintenance</h2>
          <p>You can still read the sample report and your saved sessions.</p>
          <div className="flex gap-4">
            <Link href="/sample">See the sample report</Link>
            <Link href="/progress">Open progress</Link>
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
