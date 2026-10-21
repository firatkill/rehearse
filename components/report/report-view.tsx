'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { DIMENSIONS, STORAGE } from '@/lib/config';
import {
  DIMENSION_LABELS,
  ROLE_LABELS,
  SENIORITY_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/lib/labels';
import { DIMENSION_TIPS } from '@/lib/feedback/rubric';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { aggregate } from '@/lib/report/aggregate';
import { reportMarkdown, reportFilename } from '@/lib/report/markdown';
import { SafeText } from '@/components/common/safe-text';
import { FeedbackCard } from '@/components/room/feedback-card';
import { DeliveryMetrics } from '@/components/room/delivery-metrics';
import { Button } from '@/components/ui/button';
import { TrendChart } from './trend-chart';
export function ReportView({
  session,
  answers,
  source = 'live',
  summaryLoading = false,
  onRetry,
  online = true,
}: {
  session: SessionRecord;
  answers: AnswerRecord[];
  source?: 'live' | 'sample';
  summaryLoading?: boolean;
  onRetry?: () => void;
  online?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = new Map<HTMLDetailsElement, boolean>();
    const before = () => {
      for (const detail of root.current?.querySelectorAll('details') ?? []) {
        if (!previous.has(detail)) previous.set(detail, detail.open);
        detail.open = true;
      }
    };
    const after = () => {
      for (const [detail, open] of previous) detail.open = open;
      previous.clear();
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      after();
    };
  }, []);
  const values = aggregate(answers, session.questions.length);
  const summary = session.summary;
  const answered = answers.filter((a) => a.status === 'scored' || a.status === 'saved').length;
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([reportMarkdown(session, answers)], { type: 'text/markdown;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = reportFilename(session);
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div ref={root} className="space-y-8 py-8">
      <h1>Session report</h1>
      <p className="font-mono text-sm">
        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
          new Date(session.createdAt),
        )}{' '}
        · {ROLE_LABELS[session.setup.role]}, {SENIORITY_LABELS[session.setup.seniority]} ·{' '}
        {session.setup.types.map((t) => QUESTION_TYPE_LABELS[t]).join(', ')} · {answered}/
        {session.questions.length} answered · Seed <SafeText text={session.seed} />
      </p>
      {session.status === 'in_progress' && (
        <div className="banner">
          <p>This session isn’t finished.</p>
          <Link href={`/session/${session.id}`}>Resume session</Link>
        </div>
      )}
      <section className="space-y-3">
        <h2>Summary</h2>
        {summaryLoading ? (
          <p>Writing your summary…</p>
        ) : summary ? (
          <>
            <p className="text-xl">
              <SafeText text={summary.headline} />
            </p>
            <p>
              <SafeText text={summary.paragraph} />
            </p>
            <p className="text-sm">Written by the language model from your scores.</p>
          </>
        ) : (
          <>
            <p>
              A written summary isn’t available for this session. The numbers below are calculated
              from your answers.
            </p>
            {onRetry && (
              <Button data-print="hide" disabled={!online} onClick={onRetry}>
                Try again
              </Button>
            )}
          </>
        )}
        {values.overallMean === null ? (
          <p>No answers were scored in this session.</p>
        ) : (
          <>
            <p className="font-mono text-2xl">{values.overallMean.toFixed(1)} / 4 average</p>
            {values.best && values.lowest && (
              <p>
                Best: Question {values.best.index + 1} ({values.best.overall.toFixed(1)}) · Lowest:
                Question {values.lowest.index + 1} ({values.lowest.overall.toFixed(1)})
              </p>
            )}
          </>
        )}
      </section>
      {values.focus.length > 0 && (
        <section className="space-y-4">
          <h2>Focus on these next</h2>
          {values.focus.map((d) => (
            <div key={d}>
              <h3>{DIMENSION_LABELS[d]}</h3>
              <p className="font-mono">Average {values.dimensionMeans[d]?.toFixed(1)} / 4</p>
              <p>
                <SafeText
                  text={
                    summary?.focus_notes.find((n) => n.dimension === d)?.note ?? DIMENSION_TIPS[d]
                  }
                />
              </p>
            </div>
          ))}
        </section>
      )}
      <section className="space-y-4">
        <h2>Scores by question</h2>
        <TrendChart values={values} />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption>Scores by question and dimension</caption>
            <thead>
              <tr>
                <th scope="col">Dimension</th>
                {session.questions.map((_, i) => (
                  <th key={i} scope="col">
                    Q{i + 1}
                  </th>
                ))}
                <th scope="col">Average</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((d) => (
                <tr key={d}>
                  <th scope="row">{DIMENSION_LABELS[d]}</th>
                  {session.questions.map((_, i) => (
                    <td key={i} className="font-mono">
                      {answers.find((a) => a.index === i)?.feedback?.scores[d].score ?? '—'}
                    </td>
                  ))}
                  <td className="font-mono">{values.dimensionMeans[d]?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Overall</th>
                {values.perQuestion.map((q) => (
                  <td key={q.index} className="font-mono">
                    {q.overall?.toFixed(1) ?? '—'}
                  </td>
                ))}
                <td className="font-mono">{values.overallMean?.toFixed(1) ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3">
        <h2>Delivery</h2>
        <p>
          Total words {values.delivery.totalWords}
          {values.delivery.avgWpm !== null && (
            <> · Average pace {values.delivery.avgWpm} words per minute</>
          )}{' '}
          · Filler words {values.delivery.totalFillers}
          {values.delivery.longestPauseMs !== null && (
            <> · Longest pause {(values.delivery.longestPauseMs / 1000).toFixed(1)} s</>
          )}
        </p>
      </section>
      {summary && (
        <section>
          <h2>Next practice</h2>
          <p>
            <SafeText text={summary.next_practice} />
          </p>
        </section>
      )}
      <section className="space-y-4">
        <h2>Answers</h2>
        {session.questions.map((question, index) => {
          const answer = answers.find((a) => a.index === index);
          const label = answer?.feedback
            ? `${answer.feedback.overall.toFixed(1)} / 4`
            : answer?.status === 'skipped'
              ? 'Skipped'
              : 'Not scored';
          return (
            <details key={question.id} className="border-border border-b py-3">
              <summary>
                Question {index + 1}: <SafeText text={question.prompt.slice(0, 80)} />
                {question.prompt.length > 80 ? '…' : ''} · {label}
              </summary>
              <div className="space-y-4 py-4">
                {answer?.feedback ? (
                  <FeedbackCard answer={answer} question={question} focus={false} />
                ) : answer?.status === 'skipped' ? (
                  <p>Skipped</p>
                ) : (
                  answer && (
                    <>
                      <p className="whitespace-pre-wrap">
                        <SafeText text={answer.transcript} />
                      </p>
                      <DeliveryMetrics metrics={answer.metrics} mode={answer.mode} />
                    </>
                  )
                )}
              </div>
            </details>
          );
        })}
      </section>
      <div data-print="hide" className="flex flex-wrap gap-3">
        <Button
          data-print="hide"
          onClick={() => {
            window.print();
          }}
        >
          Print or save as PDF
        </Button>
        <Button data-print="hide" variant="outline" onClick={download}>
          Download Markdown
        </Button>
        {source === 'sample' ? (
          <Link href="/setup">Start a practice session</Link>
        ) : (
          <>
            <Link
              href={`/setup?seed=${session.seed}`}
              onClick={() => {
                try {
                  localStorage.setItem(STORAGE.LOCAL_KEYS.setup, JSON.stringify(session.setup));
                } catch {
                  /* Preferences are optional in memory mode. */
                }
              }}
            >
              Practise again with the same questions
            </Link>
            <Link href="/setup">Start a new session</Link>
          </>
        )}
      </div>
    </div>
  );
}
