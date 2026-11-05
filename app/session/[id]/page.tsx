import { getEnv } from '@/lib/env';
import { demoJobs } from '@/lib/demo/content';
import { getSqliteRepository } from '@/lib/storage/sqlite/repository';
import { getJobRepository } from '@/lib/jobpost/repository';
import { Room } from '@/components/room/room';
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const env = getEnv();
  const stored = env.APP_EDITION === 'full' ? await getSqliteRepository().getSession(id) : null;
  const fullLabels: Record<string, string> = {};
  for (const question of stored?.questions ?? []) {
    if (!question.id.startsWith('gen-')) continue;
    const repo = getJobRepository();
    const generated = repo.generatedQuestion(question.id);
    const job = generated ? repo.get(generated.jobPostId) : null;
    if (job) fullLabels[question.id] = [job.company, job.role].filter(Boolean).join(' · ');
  }
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
          : fullLabels
      }
      offline={env.DEMO_MODE === 'off'}
      feedbackPerDay={env.RATE_LIMIT_FEEDBACK_PER_IP_DAILY}
      globalPerDay={env.RATE_LIMIT_GLOBAL_LLM_DAILY}
    />
  );
}
