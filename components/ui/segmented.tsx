'use client';
import { useId } from 'react';
/** Controlled radio selection, native arrow keys and one tab stop per group. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="ui-segmented">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
