import { getEnv } from '@/lib/env';
import { demoJobs } from '@/lib/demo/content';
import { Room } from '@/components/room/room';
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const env = getEnv();
  return (
    <Room
      id={id}
      jobLabels={
        env.APP_EDITION === 'demo'
          ? Object.fromEntries(
              demoJobs.flatMap((job) =>
                job.questions.map((q) => [q.id, `${job.company} · ${job.role}`]),
              ),
            )
          : {}
      }
      offline={env.DEMO_MODE === 'off'}
      feedbackPerDay={env.RATE_LIMIT_FEEDBACK_PER_IP_DAILY}
      globalPerDay={env.RATE_LIMIT_GLOBAL_LLM_DAILY}
    />
  );
}
