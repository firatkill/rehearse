import { SafeText } from '@/components/common/safe-text';
import { ProgressSegments } from '@/components/ui/progress-segments';
import { ROLE_LABELS, SENIORITY_LABELS, QUESTION_TYPE_LABELS } from '@/lib/labels';
import type { SessionRecord } from '@/lib/storage/schema';
export function ProgressHeader({
  session,
  index,
  jobLabel = null,
}: {
  session: SessionRecord;
  index: number;
  jobLabel?: string | null;
}) {
  const question = session.questions[index];
  if (!question) return null;
  return (
    <div className="room-progress">
      <ProgressSegments current={index} total={session.questions.length} />
      <p className="room-context">
        <SafeText
          text={
            jobLabel ??
            `${QUESTION_TYPE_LABELS[question.type]} · ${ROLE_LABELS[session.setup.role]}, ${SENIORITY_LABELS[session.setup.seniority]}`
          }
        />
      </p>
    </div>
  );
}
