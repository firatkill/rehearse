'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SessionRecord } from '@/lib/storage/schema';
import { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS } from '@/lib/labels';
import { aggregate } from '@/lib/report/aggregate';
import { useRepository } from '@/hooks/use-repository';
import { setStorageStatus, storageStatus } from '@/lib/storage/status';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataControls } from './data-controls';
export type HistoryEntry = { session: SessionRecord; overall: number | null };
const statusLabels = {
  completed: 'Finished',
  in_progress: 'In progress',
  ended_early: 'Ended early',
} as const;
export function HistoryList({
  entries,
  skipped,
  onDelete,
}: {
  entries: HistoryEntry[];
  skipped: number;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {skipped > 0 && <p>{skipped} saved items couldn’t be read and were skipped.</p>}
      {entries.length === 0 ? (
        <section className="space-y-3">
          <h2>No sessions yet</h2>
          <p>Your sessions will appear here after you start one.</p>
          <Button asChild>
            <Link href="/setup">Start a practice session</Link>
          </Button>
        </section>
      ) : (
        <table className="history-table w-full text-left" aria-label="Practice sessions">
          <thead>
            <tr>
              {['Date', 'Role', 'Types', 'Questions', 'Overall', 'Status', 'Actions'].map(
                (label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map(({ session, overall }) => (
              <tr key={session.id}>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Date
                  </span>
                  <time dateTime={session.createdAt}>
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(session.createdAt))}
                  </time>
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Role
                  </span>
                  {ROLE_LABELS[session.setup.role]}, {SENIORITY_LABELS[session.setup.seniority]}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Types
                  </span>
                  {session.setup.types.map((type) => QUESTION_TYPE_LABELS[type]).join(', ')}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Questions
                  </span>
                  {session.questions.length}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Overall
                  </span>
                  {overall === null ? '—' : overall.toFixed(1)}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Status
                  </span>
                  {statusLabels[session.status]}
                </td>
                <td>
                  <span className="history-label" aria-hidden="true">
                    Actions
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
                      {session.status === 'in_progress' ? 'Resume' : 'Open report'}
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onDelete(session.id);
                      }}
                    >
                      Delete
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
  const repository = useRepository();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const busy = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const refresh = useCallback(async () => {
    const result = await repository.listSessions();
    const next = await Promise.all(
      result.sessions.map(async (session) => ({
        session,
        overall: aggregate(await repository.getAnswers(session.id), session.questions.length)
          .overallMean,
      })),
    );
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
    <div className="space-y-6">
      <h1 ref={title} tabIndex={-1}>
        Your practice history
      </h1>
      <p>Sessions are saved only in this browser.</p>
      {loaded && <HistoryList entries={entries} skipped={skipped} onDelete={setDeleting} />}
      <DataControls
        count={entries.length}
        onChanged={refresh}
        onDeleted={() => {
          setEntries([]);
          setSkipped(0);
          setLoaded(true);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this session?"
        description="This removes the session and its answers from this browser. It can’t be undone."
        confirm="Delete session"
        cancel="Cancel"
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
