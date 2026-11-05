import 'server-only';
import { AppError } from '@/lib/errors';
import { JOBPOST } from '@/lib/config';
import { jobUrl, resolveHost, resolvePublicAddress, type Resolver } from './ssrf';
import { requestPage, FetchedPageSchema, type PageTransport } from './fetch-page';
import { extractJobText } from './extract';
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
  try {
    let url = jobUrl(source);
    for (let redirects = 0; ; redirects++) {
      signal.throwIfAborted();
      const address = await bounded(
        resolvePublicAddress(url, dependencies.resolve ?? resolveHost),
        signal,
      );
      const page = FetchedPageSchema.parse(
        await bounded((dependencies.transport ?? requestPage)(url, address, signal), signal),
      );
      if ([301, 302, 303, 307, 308].includes(page.status)) {
        if (redirects >= JOBPOST.MAX_REDIRECTS || !page.location) throw new Error('FETCH_REDIRECT');
        url = jobUrl(new URL(page.location, url).href);
        continue;
      }
      if (
        page.status < 200 ||
        page.status >= 300 ||
        !['', 'identity'].includes(page.encoding.toLowerCase()) ||
        !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(page.contentType)
      )
        throw new Error('FETCH_RESPONSE');
      return { text: extractJobText(page.body), sourceUrl: url.href };
    }
  } catch {
    throw new AppError('JOBPOST_FETCH_FAILED');
  }
}
