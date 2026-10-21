import { getEnv } from '@/lib/env';
import { Room } from '@/components/room/room';
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Room id={id} offline={getEnv().DEMO_MODE === 'off'} />;
}
