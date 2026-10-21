'use client';
import { useLayoutEffect, useRef } from 'react';
import { ANSWER } from '@/lib/config';
export function AnswerEditor({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (text: string) => void;
  onContinue?: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const style = getComputedStyle(element);
    const line = parseFloat(style.lineHeight);
    if (!Number.isFinite(line)) return;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    element.style.height = 'auto';
    element.style.height = `${Math.min(line * ANSWER.TEXTAREA_MAX_ROWS + padding, Math.max(line * ANSWER.TEXTAREA_MIN_ROWS + padding, element.scrollHeight))}px`;
  }, [value]);
  return (
    <div className="space-y-2">
      <label htmlFor="answer-text">Your answer</label>
      <textarea
        ref={input}
        data-phase-focus
        id="answer-text"
        className="border-input bg-background block w-full resize-y rounded border p-3 leading-6"
        rows={ANSWER.TEXTAREA_MIN_ROWS}
        maxLength={ANSWER.MAX_CHARS}
        value={value}
        aria-describedby="answer-count"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onContinue?.();
          }
        }}
      />
      <p
        id="answer-count"
        className={value.length >= ANSWER.WARN_CHARS ? 'font-mono text-[var(--warn)]' : 'font-mono'}
      >
        {value.length.toLocaleString('en-GB')} / {ANSWER.MAX_CHARS.toLocaleString('en-GB')}
      </p>
    </div>
  );
}
