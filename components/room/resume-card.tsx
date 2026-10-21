import { Button } from '@/components/ui/button';
export function ResumeCard({
  index,
  total,
  onContinue,
}: {
  index: number;
  total: number;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-4">
      <h1>Ready to continue</h1>
      <p>
        You’re on question {index + 1} of {total}.
      </p>
      <p>We restored your session after the page reloaded.</p>
      <Button className="min-h-11" data-phase-focus onClick={onContinue}>
        Continue
      </Button>
    </section>
  );
}
