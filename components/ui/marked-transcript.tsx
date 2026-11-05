import { SafeText } from '@/components/common/safe-text';
export type TranscriptMark = { start: number; end: number; kind: 'strong' | 'vague' | 'filler' };
/** Valid non-overlapping ranges only; strong/vague/filler states are text nodes, never HTML. */
export function MarkedTranscript({ text, marks = [] }: { text: string; marks?: TranscriptMark[] }) {
  const parts = [];
  let cursor = 0;
  for (const mark of [...marks].sort((a, b) => a.start - b.start)) {
    if (
      !Number.isInteger(mark.start) ||
      !Number.isInteger(mark.end) ||
      mark.start < cursor ||
      mark.end <= mark.start ||
      mark.end > text.length
    )
      continue;
    parts.push(
      <SafeText key={`text-${cursor}-${mark.start}`} text={text.slice(cursor, mark.start)} />,
    );
    parts.push(
      <mark key={`mark-${mark.start}`} className={`ui-mark-${mark.kind}`}>
        <SafeText text={text.slice(mark.start, mark.end)} />
      </mark>,
    );
    cursor = mark.end;
  }
  parts.push(<SafeText key={`tail-${cursor}`} text={text.slice(cursor)} />);
  return (
    <div>
      <ul className="ui-mark-legend" aria-label="Transcript legend">
        <li>
          <mark className="ui-mark-strong">Strong detail</mark>
        </li>
        <li>
          <span className="ui-mark-vague">Vague</span>
        </li>
        <li>
          <span className="ui-mark-filler">Filler</span>
        </li>
      </ul>
      <p className="ui-marked-text">{parts}</p>
    </div>
  );
}
