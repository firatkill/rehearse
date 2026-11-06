'use client';
import { useLabels } from '@/lib/i18n/use-labels';
import { T, useT } from '@/lib/i18n/context';
import { ComingUp } from './coming-up';
import { requestUpcoming } from '@/lib/api/upcoming-client';
import type { UpcomingItem } from '@/lib/api/upcoming-contracts';
import { APP_EDITION } from '@/lib/edition';
import { LocalSessionTime } from '@/components/common/local-session-time';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import type { SessionRecord } from '@/lib/storage/schema';
import { progressEntry, type ProgressEntry } from '@/lib/report/progress';
import { ProgressOverview } from './progress-overview';
import { useRepository } from '@/hooks/use-repository';
import { setStorageStatus, storageStatus } from '@/lib/storage/status';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataControls } from './data-controls';
export type HistoryEntry = { session: SessionRecord; overall: number | null; retries?: number };

export function HistoryList({
  entries,
  skipped,
  onDelete,
}: {
  entries: HistoryEntry[];
  skipped: number;
  onDelete: (id: string) => void;
}) {
  const { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS, DIMENSION_LABELS } = useLabels();

  const t = useT();

  const statusLabels = {
    completed: t('ui.dynamic.11'),
    in_progress: t('ui.dynamic.12'),
    ended_early: t('ui.dynamic.13'),
  } as const;
  return (
    <>
      {skipped > 0 && (
        <p>
          {skipped}
          <T id="components.history.history.list.1" />
        </p>
      )}
      {entries.length === 0 ? (
        <section className="space-y-3">
          <h2>
            <T id="components.history.history.list.2" />
          </h2>
          <p>
            <T id="components.history.history.list.3" />
          </p>
          <Button asChild>
            <Link href="/setup">
              <T id="components.history.history.list.4" />
            </Link>
          </Button>
        </section>
      ) : (
        <table className="history-table w-full text-left" aria-label={t('ui.dynamic.14')}>
          <thead>
            <tr>
              {[
                t('components.history.history.list.5'),
                t('components.history.history.list.6'),
                t('components.history.history.list.7'),
                t('components.history.history.list.9'),
                t('components.history.history.list.10'),
                t('components.history.history.list.11'),
              ].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(({ session, overall, retries = 0 }) => (
              <tr key={session.id}>
                <td>
                  <span className="history-label" aria-hidden="true">
                    <T id="components.history.history.list.5" />
                  </span>
                  <LocalSessionTime value={session.createdAt} />
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    <T id="components.history.history.list.6" />
                  </span>
                  <strong>
                    {session.setup.dimension
                      ? t('ui.template.5', { v0: DIMENSION_LABELS[session.setup.dimension] })
                      : `${ROLE_LABELS[session.setup.role]}, ${SENIORITY_LABELS[session.setup.seniority]}`}
                  </strong>
                  <span className="history-types">
                    {session.setup.types.map((type) => QUESTION_TYPE_LABELS[type]).join(', ')}
                  </span>
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    <T id="components.history.history.list.7" />
                  </span>
                  {session.questions.length}
                  <T id="components.history.history.list.8" />
                  {retries} {t(retries === 1 ? 'common.retry.one' : 'common.retry.many')}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    <T id="components.history.history.list.9" />
                  </span>
                  {overall === null ? '—' : overall.toFixed(1)}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    <T id="components.history.history.list.10" />
                  </span>
                  {statusLabels[session.status]}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    <T id="components.history.history.list.11" />
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      className="inline-flex items-center"
                      href={
                        session.status === 'in_progress'
                          ? `/session/${session.id}`
                          : `/session/${session.id}/report`
                      }
                    >
                      {session.status === 'in_progress'
                        ? t('ui.dynamic.15')
                        : t('components.room.room.7')}
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onDelete(session.id);
                      }}
                    >
                      <T id="components.history.history.list.12" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
export function History() {
  const t = useT();

  const repository = useRepository();
  const [upcoming, setUpcoming] = useState<UpcomingItem[] | null>([]);
  const [today, setToday] = useState(() => new Date());
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const busy = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const refresh = useCallback(async () => {
    const result = await repository.listSessions();
    const next = await Promise.all(
      result.sessions.map(async (session) =>
        progressEntry(session, await repository.getAnswers(session.id)),
      ),
    );
    if (APP_EDITION === 'full') setUpcoming(await requestUpcoming());
    setToday(new Date());
    setEntries(next);
    setSkipped(result.skipped);
    setLoaded(true);
  }, [repository]);
  const storageFailure = () => {
    if (storageStatus() !== 'updated') setStorageStatus('not-saving');
  };
  useEffect(() => {
    void Promise.resolve().then(refresh).catch(storageFailure);
  }, [refresh]);
  const remove = async () => {
    if (!deleting || busy.current) return;
    busy.current = true;
    try {
      await repository.deleteSession(deleting);
      await refresh();
      setDeleting(null);
      title.current?.focus();
    } catch {
      storageFailure();
    } finally {
      busy.current = false;
    }
  };
  return (
    <div className="progress-page">
      <div className="progress-heading">
        <h1 ref={title} tabIndex={-1}>
          <T id="components.history.history.list.13" />
        </h1>
        <Button asChild>
          <Link href="/setup">
            <T id="components.history.history.list.14" />
          </Link>
        </Button>
      </div>
      <p>{APP_EDITION === 'full' ? t('ui.dynamic.16') : t('ui.dynamic.17')}</p>
      {loaded && (
        <>
          {APP_EDITION === 'full' &&
            (upcoming ? (
              <ComingUp posts={upcoming} now={today} />
            ) : (
              <p role="status">
                <T id="components.history.history.list.15" />
              </p>
            ))}
          <ProgressOverview entries={entries} />
          <section className="progress-card" aria-labelledby="progress-sessions-heading">
            <div className="progress-section-heading">
              <h2 id="progress-sessions-heading">
                <T id="components.history.history.list.16" />
              </h2>
              <a href="#progress-data">
                <T id="components.history.history.list.17" />
              </a>
            </div>
            <HistoryList entries={entries} skipped={skipped} onDelete={setDeleting} />
          </section>
        </>
      )}
      <section id="progress-data" aria-label={t('components.history.data.controls.1')}>
        <DataControls
          count={entries.length}
          onChanged={refresh}
          onDeleted={() => {
            setEntries([]);
            setUpcoming([]);
            setSkipped(0);
            setLoaded(true);
          }}
        />
      </section>
      <ConfirmDialog
        open={deleting !== null}
        title={t('ui.dynamic.18')}
        description={APP_EDITION === 'full' ? t('ui.dynamic.19') : t('ui.dynamic.20')}
        confirm={t('ui.dynamic.21')}
        cancel={t('components.jobpost.job.post.9')}
        onConfirm={() => {
          void remove();
        }}
        onCancel={() => {
          setDeleting(null);
        }}
      />
    </div>
  );
}
