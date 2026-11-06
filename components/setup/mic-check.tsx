'use client';
import { T, useT } from '@/lib/i18n/context';
import { useState } from 'react';
import { checkMicrophone, type MicCheck as Result } from '@/lib/speech/microphone';
import { Button } from '@/components/ui/button';

export function MicCheck() {
  const t = useT();

  const copy = {
    pending: t('ui.dynamic.114'),
    granted: t('ui.dynamic.115'),
    denied: t('ui.dynamic.116'),
    'no-device': t('ui.dynamic.117'),
    error: t('ui.dynamic.118'),
  };
  const [result, setResult] = useState<Result | 'pending' | null>(null);
  async function check() {
    setResult('pending');
    setResult(await checkMicrophone());
  }
  return (
    <div className="mic-check">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={result === 'pending'}
        onClick={() => {
          void check();
        }}
      >
        <T id="components.setup.mic.check.1" />
      </Button>
      <p role="status">{result ? copy[result] : ''}</p>
    </div>
  );
}
