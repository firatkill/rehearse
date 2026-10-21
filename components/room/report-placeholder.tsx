'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRepository } from '@/hooks/use-repository';
import type { AnswerRecord } from '@/lib/storage/schema';
import { SafeText } from '@/components/common/safe-text';
export function ReportPlaceholder({ id }: { id: string }) {
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
      <h1>Session report</h1>
      {answers.map((answer) => (
        <section key={answer.index}>
          <h2>Question {answer.index + 1}</h2>
          <p>{answer.status === 'skipped' ? 'Skipped' : 'Saved without feedback'}</p>
          <SafeText text={answer.transcript} />
        </section>
      ))}
      <Link href="/setup">Start a new session</Link>
    </div>
  );
}
