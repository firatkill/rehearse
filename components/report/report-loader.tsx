'use client';
import { T, useSessionLanguage } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { useReport } from '@/hooks/use-report';
import { ReportView } from './report-view';
export function ReportLoader({ id }: { id: string }) {
  const { data, loaded, pending, online, canRetry, retry } = useReport(id);
  useSessionLanguage(data?.session.setup.language);
  if (!loaded)
    return (
      <p>
        <T id="components.report.report.loader.1" />
      </p>
    );
  if (!data)
    return (
      <div className="space-y-4 py-8">
        <h1>
          <T id="components.report.report.loader.2" />
        </h1>
        <p>
          <T id="components.report.report.loader.3" />
        </p>
        <Link href="/setup">
          <T id="components.report.report.loader.4" />
        </Link>
        <Link href="/history">
          <T id="components.report.report.loader.5" />
        </Link>
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
