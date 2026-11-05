import 'server-only';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { JOBPOST } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { JobTextSchema } from '@/lib/storage/jobpost-schema';
export function extractJobText(html: string): string {
  const { document } = parseHTML(html);
  if (
    document.querySelector('input[type="password"]') ||
    /sign in|log in|access denied|captcha|just a moment|verify you are human/i.test(document.title)
  )
    throw new AppError('JOBPOST_FETCH_FAILED');
  // Only plain text is retained. LinkeDOM does not load resources or execute page scripts.
  for (const element of document.querySelectorAll('script,style,noscript,iframe')) element.remove();
  const article = new Readability(document, {
    maxElemsToParse: JOBPOST.EXTRACT_MAX_ELEMENTS,
    charThreshold: 1,
    disableJSONLD: true,
  }).parse();
  const text = article?.textContent?.replace(/\s+/g, ' ').trim();
  const parsed = JobTextSchema.safeParse(text);
  if (!parsed.success) throw new AppError('JOBPOST_FETCH_FAILED');
  return parsed.data;
}
