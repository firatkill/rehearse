import { T } from '@/lib/i18n/context';
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
      <h1>
        <T id="components.room.resume.card.1" />
      </h1>
      <p>
        <T id="components.room.resume.card.2" />
        {index + 1}
        <T id="components.jobpost.job.post.16" />
        {total}.
      </p>
      <p>
        <T id="components.room.resume.card.4" />
      </p>
      <Button className="min-h-11" data-phase-focus onClick={onContinue}>
        <T id="components.room.resume.card.5" />
      </Button>
    </section>
  );
}
