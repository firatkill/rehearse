import 'server-only';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { JOBPOST } from '@/lib/config';
import { z } from 'zod';
import { JobTextSchema } from '@/lib/storage/jobpost-schema';
export function htmlText(html: string): string {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  for (const element of document.querySelectorAll('script,style,noscript,iframe')) element.remove();
  for (const element of document.querySelectorAll('p,div,li,br,h1,h2,h3')) element.append(' ');
  return document.body.textContent.replace(/\s+/g, ' ').trim();
}
function jsonLdText(value: unknown): string | undefined {
  const queue: unknown[] = [value];
  while (queue.length) {
    const item = queue.shift();
    if (Array.isArray(item)) {
      queue.push(...(item as unknown[]));
      continue;
    }
    const parsed = z.record(z.string(), z.unknown()).safeParse(item);
    if (!parsed.success) continue;
    const node = parsed.data;
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.includes('JobPosting') && typeof node.description === 'string') {
      const company = z.object({ name: z.string() }).safeParse(node.hiringOrganization);
      const text = htmlText(
        [
          typeof node.title === 'string' ? node.title : '',
          company.success ? company.data.name : '',
          node.description,
        ].join(' '),
      );
      if (JobTextSchema.safeParse(text).success) return text;
    }
    if (node['@graph']) queue.push(node['@graph']);
  }
}
export function extractJobText(html: string): string {
  const { document } = parseHTML(html);
  if (
    document.querySelector('input[type="password"]') ||
    /sign in|log in|access denied|captcha|just a moment|verify you are human/i.test(document.title)
  )
    throw new Error('FETCH_LOGIN');
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const text = jsonLdText(JSON.parse(script.textContent));
      if (text) return text;
    } catch {
      /* Malformed metadata falls back to the visible post. */
    }
  }
  const guest = document.querySelector('.show-more-less-html__markup');
  if (guest) {
    const text = htmlText(guest.innerHTML);
    if (JobTextSchema.safeParse(text).success) return text;
  }
  // Only plain text is retained. LinkeDOM does not load resources or execute page scripts.
  for (const element of document.querySelectorAll('script,style,noscript,iframe')) element.remove();
  const article = new Readability(document, {
    maxElemsToParse: JOBPOST.EXTRACT_MAX_ELEMENTS,
    charThreshold: 1,
    disableJSONLD: true,
  }).parse();
  const text = article?.textContent?.replace(/\s+/g, ' ').trim();
  const parsed = JobTextSchema.safeParse(text);
  if (!parsed.success) throw new Error('FETCH_EMPTY');
  return parsed.data;
}
