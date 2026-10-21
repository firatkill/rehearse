export type TranscriptState = { committed: string; runFinal: string; runInterim: string };

const join = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ');

/** Rebuild the current run from the full result list on every event (robust to engines that resend results). */
export function applyResults(
  s: TranscriptState,
  results: ReadonlyArray<{ transcript: string; isFinal: boolean }>,
): TranscriptState {
  const finals: string[] = [];
  const interims: string[] = [];
  for (const r of results) (r.isFinal ? finals : interims).push(r.transcript);
  return { committed: s.committed, runFinal: join(...finals), runInterim: join(...interims) };
}

/** On END or stop: keep everything heard in this run, including the last interim text. */
export function commitRun(s: TranscriptState): TranscriptState {
  return { committed: join(s.committed, s.runFinal, s.runInterim), runFinal: '', runInterim: '' };
}

export const fullText = (s: TranscriptState) => join(s.committed, s.runFinal, s.runInterim);

export function capText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > max * 0.9 ? cut.slice(0, lastSpace) : cut;
}
