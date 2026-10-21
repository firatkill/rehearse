import { SafeText } from '@/components/common/safe-text';
export function Captions({
  chunks,
  activeChunk,
}: {
  chunks: string[];
  activeChunk: number | null;
}) {
  return (
    <>
      {chunks.map((chunk, index) => (
        <span
          key={index}
          className={
            index === activeChunk ? 'underline decoration-2 underline-offset-4' : undefined
          }
        >
          <SafeText text={chunk} />
          {index < chunks.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}
