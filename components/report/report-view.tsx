'use client';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { useEffect, useRef } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { formatSessionDate } from '@/lib/date-time';
import { LocalSessionTime } from '@/components/common/local-session-time';
import { DIMENSIONS, STORAGE } from '@/lib/config';
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
  const { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS, DIMENSION_LABELS } = useLabels();

  const t = useT();
  const { language } = useI18n();

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
      <h1 className="report-label">
        <T id="components.report.report.view.1" />
      </h1>
      <p className="font-mono text-sm">
        {source === 'sample' ? (
          formatSessionDate(session.createdAt, language)
        ) : (
          <LocalSessionTime value={session.createdAt} />
        )}{' '}
        · {ROLE_LABELS[session.setup.role]}, {SENIORITY_LABELS[session.setup.seniority]} ·{' '}
        {session.setup.types.map((t) => QUESTION_TYPE_LABELS[t]).join(', ')} · {answered}/
        {session.questions.length}
        <T id="components.report.report.view.2" />
        <SafeText text={session.seed} />
      </p>
      {session.status === 'in_progress' && (
        <div className="banner">
          <p>
            <T id="components.report.report.view.3" />
          </p>
          <Link className="inline-flex min-w-11 items-center" href={`/session/${session.id}`}>
            <T id="components.report.report.view.4" />
          </Link>
        </div>
      )}
      <section className="report-overview">
        <h2 className="sr-only">
          <T id="components.report.report.view.5" />
        </h2>
        {summaryLoading ? (
          <p>
            <T id="components.report.report.view.6" />
          </p>
        ) : summary ? (
          <>
            <p className="report-headline">
              <SafeText text={summary.headline} />
            </p>
            <p>
              <SafeText text={summary.paragraph} />
            </p>
            <p className="report-meta">
              <T id="components.report.report.view.7" />
            </p>
          </>
        ) : (
          <>
            <p>
              <T id="components.report.report.view.8" />
            </p>
            {onRetry && (
              <Button data-print="hide" disabled={!online} onClick={onRetry}>
                <T id="components.report.report.view.9" />
              </Button>
            )}
          </>
        )}
        <dl className="report-stats">
          <div>
            <dt>
              <T id="components.history.progress.overview.17" />
            </dt>
            <dd>
              {values.overallMean?.toFixed(1) ?? '—'}
              <span> / 4</span>
            </dd>
          </div>
          <div>
            <dt>
              <T id="components.report.report.view.11" />
            </dt>
            <dd>
              {answered}
              <span> / {session.questions.length}</span>
            </dd>
          </div>
          <div>
            <dt>
              <T id="components.report.report.view.12" />
            </dt>
            <dd>
              {answers.reduce(
                (sum, answer) => sum + Math.max(0, answer.attemptRecords.length - 1),
                0,
              )}
            </dd>
          </div>
        </dl>
        {values.overallMean === null && (
          <p>
            <T id="components.report.report.view.13" />
          </p>
        )}
        {values.scoredCount > 1 && values.best && values.lowest && (
          <p className="report-meta">
            <T id="components.report.report.view.14" />
            {values.best.index + 1} ({values.best.overall.toFixed(1)}
            <T id="components.report.report.view.15" />
            {values.lowest.index + 1} ({values.lowest.overall.toFixed(1)})
          </p>
        )}
      </section>
      {values.focus.length > 0 && (
        <section className="report-practice" aria-label={t('ui.dynamic.43')}>
          {values.focus.slice(0, 2).map((d, index) => (
            <article key={d} className={index === 0 ? 'report-focus stage' : 'report-focus'}>
              <h2 className="report-label">
                {index === 0 ? t('ui.dynamic.44') : t('ui.dynamic.45')}
              </h2>
              <h3>{DIMENSION_LABELS[d]}</h3>
              <p className="font-mono">
                <T id="components.report.report.view.16" />
                {values.dimensionMeans[d]?.toFixed(1)} / 4
              </p>
              <p>
                <SafeText
                  text={
                    summary?.focus_notes.find((n) => n.dimension === d)?.note ??
                    t(`rubric.tip.${d}`)
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
                  ? t('ui.template.10', { v0: DIMENSION_LABELS[d] })
                  : t('ui.template.11', { v0: DIMENSION_LABELS[d] })}
              </Button>
            </article>
          ))}
        </section>
      )}
      {practice.error && (
        <div role="alert">
          <p>{practice.error}</p>
          <Link className="inline-flex min-h-11 items-center" href="/setup">
            <T id="components.report.report.view.17" />
          </Link>
        </div>
      )}
      <section className="report-heat" aria-labelledby="report-heat-heading">
        <div className="report-section-heading">
          <h2 id="report-heat-heading">
            <T id="components.report.report.view.18" />
          </h2>
          <p>
            <T id="components.report.report.view.19" />
          </p>
        </div>
        <div
          className="report-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t('ui.dynamic.46')}
        >
          <table>
            <caption className="sr-only">
              <T id="components.report.report.view.20" />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T id="components.report.report.view.21" />
                </th>
                {DIMENSIONS.map((d) => (
                  <th key={d} scope="col">
                    {DIMENSION_LABELS[d]}
                  </th>
                ))}
                <th scope="col">
                  <T id="components.report.report.view.22" />
                </th>
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
      <section className="report-card">
        <h2>
          <T id="components.report.report.view.23" />
        </h2>
        <p>
          <T id="components.report.report.view.24" />
          {values.delivery.totalWords}
          {values.delivery.avgWpm !== null && (
            <>
              <T id="components.report.report.view.25" />
              {values.delivery.avgWpm}
              <T id="components.report.report.view.26" />
            </>
          )}{' '}
          <T id="components.report.report.view.27" />
          {values.delivery.totalFillers}
          {values.delivery.longestPauseMs !== null && (
            <>
              <T id="components.report.report.view.28" />
              {(values.delivery.longestPauseMs / 1000).toFixed(1)} s
            </>
          )}
        </p>
      </section>
      {summary && (
        <section className="report-card">
          <h2>
            <T id="components.report.report.view.29" />
          </h2>
          <p>
            <SafeText text={summary.next_practice} />
          </p>
        </section>
      )}
      <section className="report-card report-answers">
        <h2>
          <T id="components.report.report.view.30" />
        </h2>
        {session.questions.map((question, index) => {
          const answer = answers.find((a) => a.index === index);
          const label = answer?.feedback
            ? `${answer.feedback.overall.toFixed(1)} / 4`
            : answer?.status === 'skipped'
              ? t('components.report.report.view.32')
              : t('ui.dynamic.47');
          return (
            <details
              id={`report-answer-${index}`}
              key={question.id}
              className="border-border border-b py-3"
            >
              <summary>
                <T id="components.report.report.view.31" />
                {index + 1}: <SafeText text={question.prompt.slice(0, 80)} />
                {question.prompt.length > 80 ? '…' : ''} · {label}
                {answer &&
                  ` · ${answer.attemptRecords.length} ${answer.attemptRecords.length === 1 ? 'try' : 'tries'}`}
              </summary>
              <div className="space-y-4 py-4">
                {answer?.feedback ? (
                  <FeedbackCard answer={answer} question={question} focus={false} />
                ) : answer?.status === 'skipped' ? (
                  <p>
                    <T id="components.report.report.view.32" />
                  </p>
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
                  <section key={item.id} aria-label={t('ui.template.13', { v0: item.ordinal })}>
                    <h3>
                      <T id="components.report.report.view.33" />
                      {item.ordinal}
                    </h3>
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
          <T id="components.report.report.view.34" />
        </Button>
        <Button data-print="hide" variant="text" onClick={download}>
          <T id="components.report.report.view.35" />
        </Button>
        {source === 'sample' ? (
          <Link className="ui-button report-main-action" data-variant="primary" href="/setup">
            <T id="components.history.history.list.4" />
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
              <T id="components.report.report.view.37" />
            </Link>
            <Link className="ui-button report-new-action" data-variant="secondary" href="/setup">
              <T id="components.report.report.view.38" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
