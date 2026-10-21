import type { Metadata } from 'next';
import { History } from '@/components/history/history-list';
export const metadata: Metadata = { title: 'History · Rehearse' };
export default function HistoryPage() {
  return <History />;
}
