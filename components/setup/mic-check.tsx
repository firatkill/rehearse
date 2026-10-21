'use client';
import { useState } from 'react';
import { checkMicrophone, type MicCheck as Result } from '@/lib/speech/microphone';
import { Button } from '@/components/ui/button';
const copy = {
  pending: 'Waiting for permission…',
  granted: 'Microphone ready.',
  denied: 'Microphone access is blocked. Allow it in your browser’s site settings, or choose Text.',
  'no-device': 'No microphone found. Connect one, or choose Text.',
  error: 'Couldn’t open the microphone. Choose Text, or try again.',
};
export function MicCheck() {
  const [result, setResult] = useState<Result | 'pending' | null>(null);
  async function check() {
    setResult('pending');
    setResult(await checkMicrophone());
  }
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={result === 'pending'}
        onClick={() => {
          void check();
        }}
      >
        Check microphone
      </Button>
      <p role="status">{result ? copy[result] : ''}</p>
    </div>
  );
}
