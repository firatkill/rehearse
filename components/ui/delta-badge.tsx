/** Signed change: positive, negative, unchanged, or unavailable. Colour is supplementary. */
export function DeltaBadge({ value }: { value: number | null }) {
  return (
    <span
      className="ui-delta"
      data-direction={value === null || value === 0 ? 'flat' : value > 0 ? 'up' : 'down'}
    >
      {value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}`}
    </span>
  );
}
