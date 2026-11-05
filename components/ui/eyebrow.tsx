import type { ComponentProps } from 'react';
import { cn } from 'cn';
/** Static label, never a live region. */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('ui-eyebrow', className)} {...props} />;
}
