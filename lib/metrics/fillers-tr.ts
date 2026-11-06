import { FILLERS_TR, LANGUAGE_LOCALES } from '@/lib/config';
import { tokenize } from './words';
/** Conservative lexical clues; grammatical uses remain unmarked. Offsets refer to NFKC source. */
export function scanTurkishFillers(text: string, enabled: readonly string[] = FILLERS_TR) {
  const source = text.normalize('NFKC').replace(/[‘’]/g, "'");
  const tokens = tokenize(source).map((token) => ({
    ...token,
    w: source.slice(token.start, token.end).toLocaleLowerCase(LANGUAGE_LOCALES.tr),
  }));
  const allowed = new Set(enabled);
  const byPhrase: Record<string, number> = {};
  const spans: Array<{ start: number; end: number }> = [];
  for (const [index, token] of tokens.entries()) {
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    const before = source.slice(previous?.end ?? 0, token.start);
    const after = source.slice(token.end, next?.start ?? source.length);
    const detached =
      (index === 0 || /[,;:.!?]/u.test(before)) && (!next || /[,;:.!?]/u.test(after));
    const repeated = previous?.w === token.w || next?.w === token.w;
    const hesitation = (word: string) => /^(?:şey|yani|hani|işte|ı{2,}|e{2,})$/u.test(word);
    const initial = index === 0 || /[.!?\n]/u.test(before) || hesitation(previous?.w ?? '');
    // Unpunctuated speech: only clear clause starters, not explanatory/deictic uses.
    const clauseStart =
      ['ben', 'biz', 'önce', 'sonra', 'aslında'].includes(next?.w ?? '') &&
      tokens[index + 2] !== undefined;
    let phrase: string | null = null;
    if (/^ı{2,}$/u.test(token.w) && !/^I+$/u.test(source.slice(token.start, token.end)))
      phrase = 'ııı';
    else if (/^e{2,}$/u.test(token.w)) phrase = 'eee';
    else if (token.w === 'şey') {
      if (
        !['bir', 'her', 'hiçbir', 'çok', 'tek', 'bu', 'şu', 'o'].includes(previous?.w ?? '') &&
        (detached || repeated || /[,;:.!?\n]/u.test(after) || hesitation(next?.w ?? ''))
      )
        phrase = token.w;
    } else if (['yani', 'hani', 'işte'].includes(token.w)) {
      // A reminder or a consequence can be meaningful even when punctuated.
      const meaningful =
        (token.w === 'hani' &&
          ['dün', 'geçen', 'hatırlıyor', 'söylemiştin'].includes(next?.w ?? '')) ||
        (token.w === 'işte' &&
          ['bu', 'bunun', 'bundan', 'çalışırken', 'çalışıyorum'].includes(next?.w ?? ''));
      if (!meaningful && (detached || repeated || (initial && clauseStart))) phrase = token.w;
    }
    if (phrase && allowed.has(phrase)) {
      byPhrase[phrase] = (byPhrase[phrase] ?? 0) + 1;
      spans.push({ start: token.start, end: token.end });
    }
  }
  return { total: spans.length, byPhrase, spans };
}
