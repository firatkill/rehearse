import type { Metadata } from 'next';
import { History } from '@/components/history/history-list';
export const metadata: Metadata = { title: 'Progress · Rehearse' };
export default function ProgressPage() {
  return <History />;
}
