import { SafeText } from '@/components/common/safe-text';
export function QuestionPanel({ prompt }: { prompt: string }) {
  return (
    <h1 id="question">
      <SafeText text={prompt} />
    </h1>
  );
}
