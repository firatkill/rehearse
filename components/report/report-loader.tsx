'use client';
import Link from 'next/link';
import { useReport } from '@/hooks/use-report';
import { ReportView } from './report-view';
export function ReportLoader({ id }: { id: string }) {
  const { data, loaded, pending, online, canRetry, retry } = useReport(id);
  if (!loaded) return <p>Loading your session…</p>;
  if (!data)
    return (
      <div className="space-y-4 py-8">
        <h1>Session not found</h1>
        <p>
          This session isn’t saved in this browser. Sessions live only in the browser where they
          were created.
        </p>
        <Link href="/setup">Start a new session</Link>
        <Link href="/history">Open history</Link>
      </div>
    );
  return (
    <ReportView
      {...data}
      summaryLoading={pending}
      online={online}
      {...(canRetry ? { onRetry: retry } : {})}
    />
  );
}
