import 'server-only';
import { isIP } from 'node:net';
import { AppError } from '@/lib/errors';
import { JOBPOST } from '@/lib/config';
import { jobUrl, resolveHost, resolvePublicAddress, type Resolver } from './ssrf';
import { requestPage, FetchedPageSchema, type PageTransport } from './fetch-page';
import { extractJobText } from './extract';
import { jobSource, extractApiJob } from './sources';
import { getLogger } from '@/lib/logger';
function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      reject(new Error('FETCH_TIMEOUT'));
    };
    if (signal.aborted) {
      void work.catch(() => {});
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    void work.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(error instanceof Error ? error : new Error('FETCH_FAILED'));
      },
    );
  });
}
export async function fetchJobPost(
  source: string,
  dependencies: { resolve?: Resolver; transport?: PageTransport; signal?: AbortSignal } = {},
) {
  const deadline = AbortSignal.timeout(JOBPOST.FETCH_TIMEOUT_MS);
  const signal = dependencies.signal ? AbortSignal.any([deadline, dependencies.signal]) : deadline;
  let host = '';
  let reason = 'blocked_address';
  try {
    const target = jobSource(jobUrl(source));
    let url = target.url;
    for (let redirects = 0; ; redirects++) {
      host = isIP(url.hostname.replace(/^\[|\]$/g, '')) ? '' : url.hostname;
      reason = 'blocked_address';
      signal.throwIfAborted();
      const address = await bounded(
        resolvePublicAddress(url, dependencies.resolve ?? resolveHost),
        signal,
      );
      reason = 'http_status';
      const raw = await bounded(
        (dependencies.transport ?? requestPage)(url, address, signal),
        signal,
      );
      if (Buffer.byteLength(raw.body, 'utf8') > JOBPOST.FETCH_MAX_BYTES)
        throw new Error('FETCH_OVERSIZE');
      const page = FetchedPageSchema.parse(raw);
      if ([301, 302, 303, 307, 308].includes(page.status)) {
        if (redirects >= JOBPOST.MAX_REDIRECTS || !page.location) throw new Error('FETCH_REDIRECT');
        reason = 'blocked_address';
        url = jobUrl(new URL(page.location, url).href);
        if (/\/(?:uas\/login|login|signin|authwall)(?:\/|$)/i.test(url.pathname))
          throw new Error('FETCH_LOGIN');
        continue;
      }
      const linkedinGuest =
        url.hostname === 'www.linkedin.com' &&
        /^\/jobs-guest\/jobs\/api\/jobPosting\/\d+$/.test(url.pathname);
      if (linkedinGuest && [429, 999].includes(page.status)) {
        reason = 'rate_limited';
        throw new Error('FETCH_STATUS');
      }
      if (page.status < 200 || page.status >= 300) throw new Error('FETCH_STATUS');
      reason = 'content_type';
      if (!['', 'identity'].includes(page.encoding.toLowerCase())) throw new Error('FETCH_TYPE');
      const json = /^application\/json(?:;|$)/i.test(page.contentType);
      if (
        !(target.kind !== 'html' && json) &&
        !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(page.contentType)
      )
        throw new Error('FETCH_TYPE');
      reason = 'empty_text';
      const text = json
        ? extractApiJob(page.body, target)
        : extractJobText(page.body, linkedinGuest);
      return { text, sourceUrl: target.kind === 'html' ? url.href : jobUrl(source).href };
    }
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.message === 'FETCH_TIMEOUT'))
      reason = 'timeout';
    else if (error instanceof Error && error.message === 'FETCH_OVERSIZE') reason = 'oversize';
    else if (error instanceof Error && error.message === 'FETCH_LOGIN') reason = 'redirect_login';
    getLogger().info({ event: 'jobpost.fetch_failed', host, reason });
    throw new AppError('JOBPOST_FETCH_FAILED');
  }
}
