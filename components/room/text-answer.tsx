'use client';
import { useEffect, useState } from 'react';
import { SESSION } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { TimerDisplay } from '@/components/common/timer-display';
import { AnswerEditor } from './answer-editor';
export function TextAnswer({
  initial,
  startedAt,
  limit,
  onDraft,
  onReview,
}: {
  initial: string;
  startedAt: number;
  limit: number;
  onDraft: (text: string) => void;
  onReview: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const offset = Date.now() - startedAt;
    const start = performance.now();
    const timer = setInterval(() => {
      setElapsed(offset + performance.now() - start);
    }, SESSION.TIMER_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [startedAt]);
  return (
    <div className="space-y-4">
      <AnswerEditor
        value={text}
        onChange={(value) => {
          setText(value);
          onDraft(value);
        }}
        onContinue={() => {
          onReview(text);
        }}
      />
      <p>
        <TimerDisplay ms={elapsed} /> / suggested <TimerDisplay ms={limit * 1000} />
      </p>
      <Button
        className="min-h-11"
        onClick={() => {
          onReview(text);
        }}
      >
        Review answer
      </Button>
    </div>
  );
}
