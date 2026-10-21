import { ReportPlaceholder } from '@/components/room/report-placeholder';
export const metadata = { title: 'Session report · Rehearse' };
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportPlaceholder id={id} />;
}
