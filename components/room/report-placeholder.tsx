'use client';
import { T, useT } from '@/lib/i18n/context';
import { useEffect, useState } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { useRepository } from '@/hooks/use-repository';
import type { AnswerRecord } from '@/lib/storage/schema';
import { SafeText } from '@/components/common/safe-text';
export function ReportPlaceholder({ id }: { id: string }) {
  const t = useT();

  const repository = useRepository();
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    void repository.getAnswers(id).then((value) => {
      if (!cancelled) setAnswers(value);
    });
    return () => {
      cancelled = true;
    };
  }, [id, repository]);
  return (
    <div className="space-y-4 py-8">
      <h1>
        <T id="components.report.report.view.1" />
      </h1>
      {answers.map((answer) => (
        <section key={answer.index}>
          <h2>
            <T id="components.report.report.view.31" />
            {answer.index + 1}
          </h2>
          <p>
            {answer.status === 'skipped'
              ? t('components.report.report.view.32')
              : t('ui.dynamic.74')}
          </p>
          <SafeText text={answer.transcript} />
        </section>
      ))}
      <Link href="/setup">
        <T id="components.report.report.loader.4" />
      </Link>
    </div>
  );
}
