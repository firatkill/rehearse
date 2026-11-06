'use client';
import { jobErrorMessage } from '@/lib/i18n/job-error';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JOBPOST } from '@/lib/config';
import { requestJob } from '@/lib/api/jobpost-client';
import { Button } from '@/components/ui/button';
export function JobEntry() {
  const t = useT();
  const { language } = useI18n();

  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (paste) input.current?.focus();
  }, [paste]);
  async function read() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    const link =
      !paste &&
      !/[\r\n]/.test(text.trim()) &&
      /^(?:[a-z][a-z\d+.-]*:\/\/|(?:https?|file|ftp|data|javascript):)/i.test(text.trim());
    const result = await requestJob(
      link
        ? { operation: 'fetch', url: text.trim(), language }
        : { operation: 'create', text, language },
    );
    if (result.ok) router.push(`/job/${result.data.post.id}`);
    else {
      setError(jobErrorMessage(result.message, t));
      setBusy(false);
      if (link) {
        setPaste(true);
        setText('');
      }
    }
  }
  return (
    <div className="space-y-3">
      <label htmlFor="job-post-input">
        {paste ? t('ui.dynamic.22') : t('components.setup.demo.job.entry.1')}
      </label>
      <textarea
        id="job-post-input"
        ref={input}
        rows={5}
        maxLength={JOBPOST.MAX_CHARS}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        aria-describedby="job-input-help"
      />
      <p id="job-input-help">
        <T id="components.jobpost.job.entry.1" />
      </p>
      <Button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => {
          void read();
        }}
      >
        {busy ? t('ui.dynamic.23') : t('components.setup.demo.job.entry.2')}
      </Button>
      {paste && (
        <Button
          type="button"
          variant="text"
          disabled={busy}
          onClick={() => {
            setPaste(false);
            setText('');
            setError(null);
            input.current?.focus();
          }}
        >
          <T id="components.jobpost.job.entry.2" />
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
