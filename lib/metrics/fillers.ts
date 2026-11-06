import { scanTurkishFillers } from './fillers-tr';
import { FILLERS, type Language } from '@/lib/config';
import { tokenize } from './words';
export const LIKE_NOT_FILLER_PREV = new Set([
  'i',
  'we',
  'you',
  'they',
  'he',
  'she',
  'people',
  'users',
  'would',
  "i'd",
  "we'd",
  "you'd",
  "they'd",
  'really',
  'do',
  'does',
  'did',
  "don't",
  "didn't",
  "doesn't",
  'feel',
  'feels',
  'felt',
  'look',
  'looks',
  'looked',
  'seem',
  'seems',
  'seemed',
  'sound',
  'sounds',
  'sounded',
  'something',
  'anything',
  'nothing',
  'things',
  'stuff',
  'tools',
  'just',
  'more',
  'less',
  'much',
]);
export const YOU_KNOW_NOT_PREV = new Set([
  'do',
  'did',
  "don't",
  "didn't",
  'if',
  'as',
  'would',
  'will',
  'to',
  'let',
  'you',
]);
export const YOU_KNOW_NOT_NEXT = new Set([
  'how',
  'what',
  'that',
  'the',
  'a',
  'an',
  'about',
  'if',
  'why',
  'when',
  'where',
  'who',
  'which',
  'it',
  'this',
  'him',
  'her',
  'them',
  'me',
  'us',
  'your',
  'my',
]);
export const SO_NOT_NEXT = new Set([
  'that',
  'far',
  'much',
  'many',
  'long',
  'called',
  'i',
  'we',
  'you',
  'he',
  'she',
  'it',
  'they',
  'there',
  'this',
  'these',
  'those',
  'the',
  'a',
  'an',
  'my',
  'our',
  'your',
  'his',
  'her',
  'its',
  'their',
  'each',
  'every',
  'some',
  'all',
  'most',
  'people',
  'users',
  'customers',
  'engineers',
  'developers',
  'reviewers',
  'teams',
  'tests',
  'requests',
  'builds',
  'deployments',
  'services',
  'clients',
]);

function scanFillers(
  text: string,
  enabled: readonly string[] = FILLERS.map((f) => f.phrase),
): {
  total: number;
  byPhrase: Record<string, number>;
  spans: Array<{ start: number; end: number }>;
} {
  const source = text.normalize('NFKC').replace(/[‘’]/g, "'");
  const tokens = tokenize(source);
  const allowed = new Set(enabled);
  const byPhrase: Record<string, number> = {};
  let total = 0;
  const spans: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    const previous = tokens[i - 1]?.w ?? '';
    const next = tokens[i + 1];
    let phrase: string | null = null;
    if (/^(u+m+|e+r+m+)$/.test(token.w)) phrase = 'um';
    else if (/^(u+h+|e+r+)$/.test(token.w)) phrase = 'uh';
    else if (token.w === 'basically' || token.w === 'actually') phrase = token.w;
    else if (token.w === 'like' && !LIKE_NOT_FILLER_PREV.has(previous)) phrase = 'like';
    else if (token.w === 'you' && next?.w === 'know') {
      const after = tokens[i + 2]?.w ?? '';
      if (
        source[next.end] === ',' ||
        (!YOU_KNOW_NOT_PREV.has(previous) && !YOU_KNOW_NOT_NEXT.has(after))
      )
        phrase = 'you know';
    } else if (token.w === 'so') {
      const before = source.slice(0, token.start).trimEnd().slice(-1);
      const initial =
        i === 0 || /[.,;:?!]/.test(before) || ['and', 'but', 'um', 'uh'].includes(previous);
      if (initial && !SO_NOT_NEXT.has(next?.w ?? '')) phrase = 'so';
    }
    if (phrase !== null && allowed.has(phrase)) {
      byPhrase[phrase] = (byPhrase[phrase] ?? 0) + 1;
      total++;
      spans.push({
        start: token.start,
        end: phrase === 'you know' ? (next?.end ?? token.end) : token.end,
      });
      if (phrase === 'you know') i++;
    }
  }
  return { total, byPhrase, spans };
}

export function countFillers(
  text: string,
  enabled?: readonly string[],
  language: Language = 'en',
): { total: number; byPhrase: Record<string, number> } {
  const { total, byPhrase } =
    language === 'tr' ? scanTurkishFillers(text, enabled) : scanFillers(text, enabled);
  return { total, byPhrase };
}
export function fillerSpans(
  text: string,
  language: Language = 'en',
): Array<{ start: number; end: number }> {
  // Avoid applying normalised offsets to a differently sized original string.
  if (text.normalize('NFKC').length !== text.length) return [];
  return (language === 'tr' ? scanTurkishFillers(text) : scanFillers(text)).spans;
}
