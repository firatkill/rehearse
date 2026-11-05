'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JOBPOST } from '@/lib/config';
import { requestJob } from '@/lib/api/jobpost-client';
import { Button } from '@/components/ui/button';
export function JobEntry() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function read() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    const result = await requestJob({ operation: 'create', text });
    if (result.ok) router.push(`/job/${result.data.post.id}`);
    else {
      setError(result.message);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <label htmlFor="job-post-input">Job post link or text</label>
      <textarea
        id="job-post-input"
        rows={5}
        maxLength={JOBPOST.MAX_CHARS}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        aria-describedby="job-input-help"
      />
      <p id="job-input-help">
        Paste the job post text. You’ll review what we read before generating questions. Link
        fetching is coming next.
      </p>
      <Button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => {
          void read();
        }}
      >
        {busy ? 'Reading the job post…' : 'Read the job post'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
