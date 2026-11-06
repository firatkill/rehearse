'use client';
import { T, useT } from '@/lib/i18n/context';
import { useEffect, useState } from 'react';
import { BUDGET } from '@/lib/config';
import type { BudgetLevel } from '@/lib/api/budget-contract';
export function BudgetBanner({ initialLevel }: { initialLevel?: BudgetLevel }) {
  const t = useT();

  const [level, setLevel] = useState<BudgetLevel>(initialLevel ?? 'none');
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/budget', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const { BudgetSchema } = await import('@/lib/api/budget-contract');
        const budget = BudgetSchema.parse(await response.json());
        if (!controller.signal.aborted) setLevel(budget.level);
      } catch {
        /* A warning service must not block practice. */
      }
    };
    // A validated server snapshot already covers the first paint. Poll/focus refreshes remain live.
    if (initialLevel === undefined) void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, BUDGET.POLL_MS);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [initialLevel]);
  if (level === 'none') return null;
  return (
    <p role="status" className="bg-accent-tint px-4 py-3 text-center text-sm">
      {level === '100' ? t('ui.dynamic.38') : t('ui.dynamic.39')}{' '}
      <T id="components.layout.budget.banner.1" />
    </p>
  );
}
