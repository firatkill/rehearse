import { getEnv } from '@/lib/env';
import { Room } from '@/components/room/room';
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const env = getEnv();
  return (
    <Room
      id={id}
      offline={env.DEMO_MODE === 'off'}
      feedbackPerDay={env.RATE_LIMIT_FEEDBACK_PER_IP_DAILY}
      globalPerDay={env.RATE_LIMIT_GLOBAL_LLM_DAILY}
    />
  );
}
