import { serverTranslator } from '@/lib/i18n/server';
import { ReportLoader } from '@/components/report/report-loader';
export async function generateMetadata() {
  const t = await serverTranslator();
  return { title: t('title.report') };
}
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportLoader id={id} />;
}
