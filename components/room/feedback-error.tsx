'use client';
import { T, useT, useI18n } from '@/lib/i18n/context';
import { formatLocalTime } from '@/lib/date-time';
import { LANGUAGE_LOCALES } from '@/lib/config';
import { useState } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { Button } from '@/components/ui/button';
import { SafeText } from '@/components/common/safe-text';
import { SESSION } from '@/lib/config';
import type { ErrorCode } from '@/lib/errors';

export function FeedbackError({
  code,
  requestId,
  retries,
  network,
  resetAt,
  feedbackPerDay,
  globalPerDay,
  online,
  onRetry,
  onSave,
}: {
  code: ErrorCode;
  requestId: string | null;
  retries: number;
  network: boolean;
  resetAt: string | null;
  feedbackPerDay: number;
  globalPerDay: number;
  online: boolean;
  onRetry: () => void;
  onSave: () => void;
}) {
  const t = useT();
  const { language } = useI18n();

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
  let title = t('ui.dynamic.53');
  let body = t('ui.template.22', { v0: requestId?.slice(0, 8) ?? '' });
  let retry = true;
  let restart = false;
  let focus: 'heading' | 'retry' | 'save' = 'retry';
  if (network) {
    title = t('ui.dynamic.54');
    body = t('ui.dynamic.55');
  } else
    switch (code) {
      case 'PROVIDER_ERROR':
      case 'PROVIDER_TIMEOUT':
      case 'FEEDBACK_INVALID':
        title = t('ui.dynamic.56');
        body = t('ui.template.23', {
          v0: retries > 0 ? t('ui.template.24', { v0: retries }) : t('ui.dynamic.57'),
        });
        break;
      case 'LIMITER_UNAVAILABLE':
        title = t('ui.dynamic.56');
        body = t('ui.dynamic.58');
        break;
      case 'SESSION_FEEDBACK_EXHAUSTED':
        title = t('ui.dynamic.59');
        body = t('ui.dynamic.60');
        retry = false;
        focus = 'save';
        break;
      case 'FEEDBACK_QUOTA_EXCEEDED':
        title = t('ui.dynamic.61');
        body = t('ui.template.25', { v0: feedbackPerDay, v1: reset });
        retry = false;
        focus = 'heading';
        break;
      case 'GLOBAL_CAP_REACHED':
        title = t('ui.dynamic.62');
        body = t('ui.template.26', { v0: globalPerDay, v1: reset });
        retry = false;
        focus = 'heading';
        break;
      case 'DEMO_ONLY':
        title = t('ui.dynamic.63');
        body = t('ui.dynamic.64');
        retry = false;
        focus = 'heading';
        break;
      case 'DEMO_READONLY':
        title = t('ui.dynamic.65');
        body = t('ui.dynamic.66');
        retry = false;
        focus = 'heading';
        break;
      case 'TOKEN_EXPIRED':
        title = t('ui.dynamic.67');
        body = t('ui.template.27', { v0: SESSION.TOKEN_TTL_S / 3600 });
        retry = false;
        restart = true;
        focus = 'heading';
        break;
      case 'TOKEN_INVALID':
      case 'TOKEN_MISSING':
      case 'TOKEN_SCOPE':
        title = t('ui.dynamic.68');
        body = t('ui.dynamic.69');
        retry = false;
        restart = true;
        focus = 'heading';
        break;
    }
  return (
    <section className="space-y-4">
      <div role="alert" aria-live="assertive" aria-atomic="true">
        <h2 tabIndex={-1} data-phase-focus={focus === 'heading' || undefined}>
          {title}
        </h2>
      </div>
      <p>
        <SafeText text={body} />
      </p>
      <div className="flex flex-wrap gap-3">
        {retry && (
          <Button
            data-phase-focus={focus === 'retry' || undefined}
            disabled={!online}
            onClick={onRetry}
          >
            <T id="components.report.report.view.9" />
          </Button>
        )}
        <Button data-phase-focus={focus === 'save' || undefined} onClick={onSave}>
          <T id="components.room.feedback.error.2" />
        </Button>
        {restart && (
          <Link className="inline-flex min-w-11 items-center" href="/setup">
            <T id="components.report.report.loader.4" />
          </Link>
        )}
      </div>
    </section>
  );
}
