import type { ComponentProps } from 'react';
import { cn } from 'cn';
/** Neutral surface; callers supply semantic headings and loading/error content. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('ui-card', className)} {...props} />;
}
