'use client';
import { useNumbers } from '@/lib/i18n/use-numbers';
/** Signed change: positive, negative, unchanged, or unavailable. Colour is supplementary. */
export function DeltaBadge({ value }: { value: number | null }) {
  const { number } = useNumbers();
  return (
    <span
      className="ui-delta"
      data-direction={value === null || value === 0 ? 'flat' : value > 0 ? 'up' : 'down'}
    >
      {value === null ? '—' : `${value > 0 ? '+' : ''}${number(value, 1)}`}
    </span>
  );
}
