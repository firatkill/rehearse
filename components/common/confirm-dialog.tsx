'use client';
import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export function ConfirmDialog({
  open,
  title,
  description,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const confirmed = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onCancel();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          trigger.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          confirmed.current = false;
          keep.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!confirmed.current && trigger.current?.isConnected) trigger.current.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => {
              confirmed.current = true;
              onConfirm();
            }}
          >
            {confirm}
          </Button>
          <Button className="min-h-11" ref={keep} onClick={onCancel}>
            {cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
