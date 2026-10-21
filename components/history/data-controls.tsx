'use client';
import { useRef, useState } from 'react';
import { useRepository, useStorageStatus } from '@/hooks/use-repository';
import { setStorageStatus, storageStatus } from '@/lib/storage/status';
import { Button } from '@/components/ui/button';
import { version } from '@/package.json';
import { downloadExport, ImportFileError } from '@/lib/storage/export';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
export function DataControls({
  count,
  onChanged,
  onDeleted,
}: {
  count: number;
  onChanged: () => Promise<void>;
  onDeleted: () => void;
}) {
  const repository = useRepository();
  const storage = useStorageStatus();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const remove = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setOpen(false);
    setMessage('');
    try {
      await repository.deleteAll();
      onDeleted();
      setMessage('All Rehearse data was deleted from this browser.');
      title.current?.focus();
    } catch {
      if (storageStatus() !== 'updated') setStorageStatus('not-saving');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const exportSessions = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage('');
    try {
      const file = await repository.exportAll(version);
      downloadExport(file);
      setMessage(`Exported ${file.sessions.length} sessions.`);
    } catch {
      if (storageStatus() !== 'updated') setStorageStatus('not-saving');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const importSessions = async (file: File) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage('');
    try {
      const result = await repository.importAll(file);
      await onChanged();
      setMessage(
        `Imported ${result.imported} sessions. Skipped ${result.skipped} that were already here.`,
      );
    } catch (error) {
      if (error instanceof ImportFileError) setMessage(error.message);
      else if (storageStatus() !== 'updated') setStorageStatus('not-saving');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <section className="space-y-4">
      <h2 ref={title} tabIndex={-1}>
        Your data
      </h2>
      <Button
        variant="outline"
        disabled={pending || count === 0}
        onClick={() => {
          void exportSessions();
        }}
      >
        Export all sessions
      </Button>
      <div className="space-y-2">
        <label className="block" htmlFor="import-sessions">
          Import sessions from a file
        </label>
        <input
          className="block min-h-11 max-w-full"
          id="import-sessions"
          type="file"
          accept=".json"
          disabled={pending}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void importSessions(file);
          }}
        />
      </div>
      <Button
        variant="outline"
        className="text-[var(--warn)]"
        disabled={pending}
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete all my data
      </Button>
      <div role="status">
        {pending && storage === 'delete-blocked'
          ? 'Close other Rehearse tabs to finish deleting.'
          : message}
      </div>
      <ConfirmDialog
        open={open}
        title="Delete all your data?"
        description="This removes every session, answer and setting stored by Rehearse in this browser. It can’t be undone. Consider exporting first."
        confirm="Delete everything"
        cancel="Cancel"
        onConfirm={() => {
          void remove();
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </section>
  );
}
