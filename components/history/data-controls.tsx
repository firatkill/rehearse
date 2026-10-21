'use client';
import { useRef, useState } from 'react';
import { useRepository, useStorageStatus } from '@/hooks/use-repository';
import { setStorageStatus, storageStatus } from '@/lib/storage/status';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
export function DataControls({ onDeleted }: { count: number; onDeleted: () => void }) {
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
  return (
    <section className="space-y-4">
      <h2 ref={title} tabIndex={-1}>
        Your data
      </h2>
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
