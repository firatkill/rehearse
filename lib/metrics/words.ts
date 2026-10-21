export type Tok = { w: string; start: number; end: number };

export function tokenize(text: string): Tok[] {
  const t = text.normalize('NFKC').replace(/[‘’]/g, "'");
  const out: Tok[] = [];
  for (const m of t.matchAll(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Preserve the normative TRD 16.1 fallback.
    const start = m.index ?? 0;
    out.push({ w: m[0].toLowerCase(), start, end: start + m[0].length });
  }
  return out;
}

export const countWords = (text: string): number => tokenize(text).length;
