'use client';

import { useT } from '@/lib/i18n/context';
import type { FailKind } from '@/lib/speech/types';
import { Button } from '@/components/ui/button';

export function SpeechError({
  error,
  onType,
  onRetry,
}: {
  error: FailKind;
  onType: () => void;
  onRetry: () => void;
}) {
  const t = useT();

  const copy = {
    permission: [t('ui.dynamic.98'), t('ui.dynamic.99')],
    'no-device': [t('ui.dynamic.100'), t('ui.dynamic.101')],
    'no-speech': [t('ui.dynamic.102'), t('ui.dynamic.103')],
    unavailable: [t('ui.dynamic.104'), t('ui.dynamic.105')],
  } as const;
  const retryFirst = error === 'no-speech';
  return (
    <section className="space-y-4">
      <div role="alert" aria-live="assertive" aria-atomic="true">
        <h2>{copy[error][0]}</h2>
      </div>
      <p>{copy[error][1]}</p>
      <div className="flex flex-wrap gap-3">
        <Button data-phase-focus onClick={retryFirst ? onRetry : onType}>
          {retryFirst ? t('components.report.report.view.9') : t('components.room.room.22')}
        </Button>
        <Button variant="outline" onClick={retryFirst ? onType : onRetry}>
          {retryFirst ? t('components.room.room.22') : t('components.report.report.view.9')}
        </Button>
      </div>
    </section>
  );
}
