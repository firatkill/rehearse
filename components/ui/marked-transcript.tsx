'use client';
import { T, useT } from '@/lib/i18n/context';
import { SafeText } from '@/components/common/safe-text';
export type TranscriptMark = { start: number; end: number; kind: 'strong' | 'vague' | 'filler' };
/** Valid non-overlapping ranges only; strong/vague/filler states are text nodes, never HTML. */
export function MarkedTranscript({ text, marks = [] }: { text: string; marks?: TranscriptMark[] }) {
  const t = useT();

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
      <ul className="ui-mark-legend" aria-label={t('ui.dynamic.137')}>
        <li>
          <mark className="ui-mark-strong">
            <T id="components.ui.marked.transcript.1" />
          </mark>
        </li>
        <li>
          <span className="ui-mark-vague">
            <T id="components.ui.marked.transcript.2" />
          </span>
        </li>
        <li>
          <span className="ui-mark-filler">
            <T id="components.ui.marked.transcript.3" />
          </span>
        </li>
      </ul>
      <p className="ui-marked-text">{parts}</p>
    </div>
  );
}
