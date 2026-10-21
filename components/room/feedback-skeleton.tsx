'use client';
import { useEffect, useState } from 'react';
import { PROGRESS_COPY_AT_MS } from '@/lib/config';
const copy = [
  'Reading your answer…',
  'Scoring six dimensions…',
  'Writing suggestions…',
  'Almost done…',
] as const;
export function FeedbackSkeleton() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = PROGRESS_COPY_AT_MS.map((at, index) =>
      setTimeout(() => {
        setStep(index);
      }, at),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <section aria-busy="true" className="space-y-4">
      <p>{copy[step]}</p>
      <div aria-hidden="true" className="space-y-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 border-b border-[var(--rule)]" />
        ))}
      </div>
    </section>
  );
}
