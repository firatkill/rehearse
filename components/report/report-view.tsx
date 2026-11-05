'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatSessionDate } from '@/lib/date-time';
import { LocalSessionTime } from '@/components/common/local-session-time';
import { DIMENSIONS, STORAGE } from '@/lib/config';
import {
  DIMENSION_LABELS,
  ROLE_LABELS,
  SENIORITY_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/lib/labels';
import { DIMENSION_TIPS } from '@/lib/feedback/rubric';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { bestAnswer } from '@/lib/storage/attempts';
import { aggregate } from '@/lib/report/aggregate';
import { reportMarkdown, reportFilename } from '@/lib/report/markdown';
import { SafeText } from '@/components/common/safe-text';
import { FeedbackCard } from '@/components/room/feedback-card';
import { DeliveryMetrics } from '@/components/room/delivery-metrics';
import { Button } from '@/components/ui/button';
import { useDimensionPractice } from '@/hooks/use-dimension-practice';
import { HeatCell } from '@/components/ui/heat-cell';
import { TrendChart } from './trend-chart';
export function ReportView({
  session,
  answers: allAnswers,
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
  const answers = allAnswers.map(bestAnswer);
  const practice = useDimensionPractice(session.setup);
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
    <div ref={root} className="report-view">
      <h1 className="report-label">Session report</h1>
      <p className="font-mono text-sm">
        {source === 'sample' ? (
          formatSessionDate(session.createdAt)
        ) : (
          <LocalSessionTime value={session.createdAt} />
        )}{' '}
        · {ROLE_LABELS[session.setup.role]}, {SENIORITY_LABELS[session.setup.seniority]} ·{' '}
        {session.setup.types.map((t) => QUESTION_TYPE_LABELS[t]).join(', ')} · {answered}/
        {session.questions.length} answered · Seed <SafeText text={session.seed} />
      </p>
      {session.status === 'in_progress' && (
        <div className="banner">
          <p>This session isn’t finished.</p>
          <Link className="inline-flex min-w-11 items-center" href={`/session/${session.id}`}>
            Resume session
          </Link>
        </div>
      )}
      <section className="report-overview">
        <h2 className="sr-only">Summary</h2>
        {summaryLoading ? (
          <p>Writing your summary…</p>
        ) : summary ? (
          <>
            <p className="report-headline">
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
        <dl className="report-stats">
          <div>
            <dt>Average</dt>
            <dd>
              {values.overallMean?.toFixed(1) ?? '—'}
              <span> / 4</span>
            </dd>
          </div>
          <div>
            <dt>Answered</dt>
            <dd>
              {answered}
              <span> / {session.questions.length}</span>
            </dd>
          </div>
          <div>
            <dt>Retries</dt>
            <dd>
              {answers.reduce(
                (sum, answer) => sum + Math.max(0, answer.attemptRecords.length - 1),
                0,
              )}
            </dd>
          </div>
        </dl>
        {values.overallMean === null && <p>No answers were scored in this session.</p>}
        {values.scoredCount > 1 && values.best && values.lowest && (
          <p className="report-meta">
            Best: Question {values.best.index + 1} ({values.best.overall.toFixed(1)}) · Lowest:
            Question {values.lowest.index + 1} ({values.lowest.overall.toFixed(1)})
          </p>
        )}
      </section>
      {values.focus.length > 0 && (
        <section className="report-practice" aria-label="Next practice priorities">
          {values.focus.slice(0, 2).map((d, index) => (
            <article key={d} className={index === 0 ? 'report-focus stage' : 'report-focus'}>
              <h2 className="report-label">
                {index === 0 ? 'Practise this next' : 'Also worth a session'}
              </h2>
              <h3>{DIMENSION_LABELS[d]}</h3>
              <p className="font-mono">Average {values.dimensionMeans[d]?.toFixed(1)} / 4</p>
              <p>
                <SafeText
                  text={
                    summary?.focus_notes.find((n) => n.dimension === d)?.note ?? DIMENSION_TIPS[d]
                  }
                />
              </p>
              <Button
                variant={index === 0 ? 'on-dark' : 'text'}
                disabled={practice.pending}
                onClick={() => {
                  void practice.start(d);
                }}
                data-print="hide"
              >
                {index === 0
                  ? `Practise ${DIMENSION_LABELS[d]} · 3 questions`
                  : `Practise ${DIMENSION_LABELS[d]}`}
              </Button>
            </article>
          ))}
        </section>
      )}
      {practice.error && (
        <div role="alert">
          <p>{practice.error}</p>
          <Link className="inline-flex min-h-11 items-center" href="/setup">
            Open setup
          </Link>
        </div>
      )}
      <section className="report-heat" aria-labelledby="report-heat-heading">
        <div className="report-section-heading">
          <h2 id="report-heat-heading">Every answer at a glance</h2>
          <p>Best attempt shown · darker is better</p>
        </div>
        <div
          className="report-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scores by question and dimension, scroll horizontally"
        >
          <table>
            <caption className="sr-only">Scores by question and dimension</caption>
            <thead>
              <tr>
                <th scope="col">Question</th>
                {DIMENSIONS.map((d) => (
                  <th key={d} scope="col">
                    {DIMENSION_LABELS[d]}
                  </th>
                ))}
                <th scope="col">Tries</th>
              </tr>
            </thead>
            <tbody>
              {session.questions.map((question, index) => {
                const answer = answers.find((a) => a.index === index);
                return (
                  <tr key={question.id}>
                    <th scope="row">
                      <a
                        href={`#report-answer-${index}`}
                        onClick={() => {
                          const detail = root.current?.querySelector<HTMLDetailsElement>(
                            `#report-answer-${index}`,
                          );
                          if (detail) detail.open = true;
                        }}
                      >
                        <SafeText text={question.prompt} />
                      </a>
                    </th>
                    {DIMENSIONS.map((d) => (
                      <td key={d}>
                        <HeatCell score={answer?.feedback?.scores[d].score ?? null} />
                      </td>
                    ))}
                    <td className="font-mono">{answer?.attemptRecords.length ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TrendChart values={values} />
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
            <details
              id={`report-answer-${index}`}
              key={question.id}
              className="border-border border-b py-3"
            >
              <summary>
                Question {index + 1}: <SafeText text={question.prompt.slice(0, 80)} />
                {question.prompt.length > 80 ? '…' : ''} · {label}
                {answer &&
                  ` · ${answer.attemptRecords.length} ${answer.attemptRecords.length === 1 ? 'try' : 'tries'}`}
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
                {answer?.followUpRecords.map((item) => (
                  <section key={item.id} aria-label={`Follow-up ${item.ordinal}`}>
                    <h3>Follow-up {item.ordinal}</h3>
                    <p>
                      <SafeText text={item.prompt} />
                    </p>
                    {item.feedback ? (
                      <FeedbackCard
                        idSuffix={item.id}
                        answer={{ ...answer, ...item }}
                        question={{ ...question, prompt: item.prompt }}
                        focus={false}
                      />
                    ) : (
                      <p>
                        <SafeText text={item.transcript} />
                      </p>
                    )}
                  </section>
                ))}
              </div>
            </details>
          );
        })}
      </section>
      <div data-print="hide" className="report-actions">
        <Button
          data-print="hide"
          variant="text"
          onClick={() => {
            window.print();
          }}
        >
          Save as PDF
        </Button>
        <Button data-print="hide" variant="text" onClick={download}>
          Download Markdown
        </Button>
        {source === 'sample' ? (
          <Link className="ui-button report-main-action" data-variant="primary" href="/setup">
            Start a practice session
          </Link>
        ) : (
          <>
            <Link
              className="ui-button report-main-action"
              data-variant="primary"
              href={`/setup?seed=${session.seed}`}
              onClick={() => {
                try {
                  localStorage.setItem(STORAGE.LOCAL_KEYS.setup, JSON.stringify(session.setup));
                } catch {
                  /* Preferences are optional in memory mode. */
                }
              }}
            >
              Practise the same questions again
            </Link>
            <Link className="ui-button report-new-action" data-variant="secondary" href="/setup">
              New session
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
