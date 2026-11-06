import { serverTranslator } from '@/lib/i18n/server';
import { History } from '@/components/history/history-list';
export async function generateMetadata() {
  const t = await serverTranslator();
  return { title: t('title.progress') };
}
export default function ProgressPage() {
  return <History />;
}
