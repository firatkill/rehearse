import type { FailKind } from '@/lib/speech/types';
import { Button } from '@/components/ui/button';
const copy = {
  permission: [
    'Microphone access is blocked',
    'To answer out loud, allow microphone access for this site in your browser settings, then choose Try again. Or type your answer.',
  ],
  'no-device': [
    'No microphone found',
    'Connect a microphone and choose Try again, or type your answer.',
  ],
  'no-speech': [
    'We didn’t hear anything',
    'Check that the right microphone is selected and not muted, then try again. Or type your answer.',
  ],
  unavailable: [
    'Speech recognition isn’t available right now',
    'Your browser’s speech service didn’t start. In Safari, this can happen when Siri and Dictation are turned off. You can type your answer.',
  ],
} as const;
export function SpeechError({
  error,
  onType,
  onRetry,
}: {
  error: FailKind;
  onType: () => void;
  onRetry: () => void;
}) {
  const retryFirst = error === 'no-speech';
  return (
    <section className="space-y-4">
      <div role="alert" aria-live="assertive" aria-atomic="true">
        <h2>{copy[error][0]}</h2>
      </div>
      <p>{copy[error][1]}</p>
      <div className="flex flex-wrap gap-3">
        <Button data-phase-focus onClick={retryFirst ? onRetry : onType}>
          {retryFirst ? 'Try again' : 'Type instead'}
        </Button>
        <Button variant="outline" onClick={retryFirst ? onType : onRetry}>
          {retryFirst ? 'Type instead' : 'Try again'}
        </Button>
      </div>
    </section>
  );
}
