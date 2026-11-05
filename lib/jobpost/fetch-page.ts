import 'server-only';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';
import { z } from 'zod';
import { JOBPOST } from '@/lib/config';
import type { PinnedAddress } from './ssrf';
export const FetchedPageSchema = z
  .object({
    status: z.number().int(),
    location: z.string().nullable(),
    contentType: z.string(),
    encoding: z.string(),
    body: z.string().max(JOBPOST.FETCH_MAX_BYTES),
  })
  .strict();
export type FetchedPage = z.infer<typeof FetchedPageSchema>;
export type PageTransport = (
  url: URL,
  address: PinnedAddress,
  signal: AbortSignal,
) => Promise<FetchedPage>;
/** Core HTTP does not follow redirects. Its socket lookup can use only the validated address. */
export const requestPage: PageTransport = (url, address, signal) =>
  new Promise((resolve, reject) => {
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    };
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        method: 'GET',
        agent: false,
        signal,
        family: address.family,
        lookup: pinnedLookup,
        headers: {
          'User-Agent': JOBPOST.FETCH_USER_AGENT,
          Accept: 'text/html, application/xhtml+xml',
          'Accept-Encoding': 'identity',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const length = Number(response.headers['content-length']);
        if (Number.isFinite(length) && length > JOBPOST.FETCH_MAX_BYTES) {
          response.destroy();
          reject(new Error('FETCH_OVERSIZE'));
          return;
        }
        response.on('data', (chunk: Buffer) => {
          size += chunk.byteLength;
          if (size > JOBPOST.FETCH_MAX_BYTES) {
            response.destroy(new Error('FETCH_OVERSIZE'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location ?? null,
            contentType: response.headers['content-type'] ?? '',
            encoding: response.headers['content-encoding'] ?? 'identity',
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
