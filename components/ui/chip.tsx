import type { ComponentProps } from 'react';
import { cn } from 'cn';
/** Controlled toggle; native button supplies Enter/Space, focus and disabled behaviour. */
export function Chip({
  selected,
  className,
  ...props
}: ComponentProps<'button'> & { selected: boolean }) {
  return (
    <button type="button" className={cn('ui-chip', className)} aria-pressed={selected} {...props} />
  );
}
