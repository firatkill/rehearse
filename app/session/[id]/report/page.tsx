import { ReportLoader } from '@/components/report/report-loader';
export const metadata = { title: 'Session report · Rehearse' };
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportLoader id={id} />;
}
