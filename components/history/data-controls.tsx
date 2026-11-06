'use client';
import { T, useT } from '@/lib/i18n/context';
import { APP_EDITION } from '@/lib/edition';
import { useRef, useState } from 'react';
import { useRepository, useStorageStatus } from '@/hooks/use-repository';
import { setStorageStatus, storageStatus } from '@/lib/storage/status';
import { Button } from '@/components/ui/button';
import { APP_VERSION as version } from '@/lib/version';
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
  const t = useT();

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
      setMessage(APP_EDITION === 'full' ? t('ui.dynamic.4') : t('ui.dynamic.5'));
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
      setMessage(t('ui.template.3', { v0: file.sessions.length }));
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
      setMessage(t('ui.template.4', { v0: result.imported, v1: result.skipped }));
    } catch (error) {
      if (error instanceof ImportFileError) setMessage(t(`import.${error.kind}`));
      else if (storageStatus() !== 'updated') setStorageStatus('not-saving');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <section className="data-controls">
      <h2 ref={title} tabIndex={-1}>
        <T id="components.history.data.controls.1" />
      </h2>
      <Button
        variant="outline"
        disabled={pending || count === 0}
        onClick={() => {
          void exportSessions();
        }}
      >
        <T id="components.history.data.controls.2" />
      </Button>
      <div className="data-import">
        <label className="block" htmlFor="import-sessions">
          <T id="components.history.data.controls.3" />
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
        className="data-delete"
        disabled={pending}
        onClick={() => {
          setOpen(true);
        }}
      >
        <T id="components.history.data.controls.4" />
      </Button>
      <div role="status">
        {pending && storage === 'delete-blocked' ? t('ui.dynamic.6') : message}
      </div>
      <ConfirmDialog
        open={open}
        title={t('ui.dynamic.7')}
        description={APP_EDITION === 'full' ? t('ui.dynamic.8') : t('ui.dynamic.9')}
        confirm={t('ui.dynamic.10')}
        cancel={t('components.jobpost.job.post.9')}
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
