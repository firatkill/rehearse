'use client';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { formatLocalTime } from '@/lib/date-time';
import { LANGUAGE_LOCALES } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { Button } from '@/components/ui/button';

export function QuotaPanel({
  kind,
  resetAt,
  sessionsPerDay,
  onPractise,
  onRetry,
  pending,
}: {
  kind: 'quota' | 'limiter_unavailable';
  resetAt?: string;
  sessionsPerDay: number;
  onPractise: () => void;
  onRetry: () => void;
  pending: boolean;
}) {
  const t = useT();
  const { language } = useI18n();

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [kind]);
  const [now] = useState(() => Date.now());
  let reset = '';
  if (resetAt) {
    const date = new Date(resetAt);
    const minutes = (date.getTime() - now) / 60000;
    const relative = new Intl.RelativeTimeFormat(LANGUAGE_LOCALES[language], {
      numeric: 'auto',
    }).format(Math.ceil(minutes < 60 ? minutes : minutes / 60), minutes < 60 ? 'minute' : 'hour');
    reset = `${formatLocalTime(date, language)} (${relative})`;
  }
  return (
    <section className="space-y-4">
      <h2 ref={heading} tabIndex={-1}>
        {kind === 'quota' ? t('ui.dynamic.119') : t('ui.dynamic.120')}
      </h2>
      <p>
        {kind === 'quota'
          ? t('ui.template.37', { v0: sessionsPerDay, v1: reset })
          : t('ui.dynamic.121')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" type="button" disabled={pending} onClick={onPractise}>
          <T id="components.setup.quota.panel.1" />
        </Button>
        {kind === 'quota' ? (
          <Link href="/sample">
            <T id="components.layout.banners.2" />
          </Link>
        ) : (
          <Button
            className="min-h-11"
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onRetry}
          >
            <T id="components.report.report.view.9" />
          </Button>
        )}
      </div>
    </section>
  );
}
