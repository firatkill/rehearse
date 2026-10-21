import { chunkForSpeech } from '@/lib/speech/chunk';
import { Captions } from './captions';
export function QuestionPanel({
  prompt,
  activeChunk = null,
}: {
  prompt: string;
  activeChunk?: number | null;
}) {
  return (
    <h1 id="question">
      <Captions chunks={chunkForSpeech(prompt)} activeChunk={activeChunk} />
    </h1>
  );
}
