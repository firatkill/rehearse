import 'server-only';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { z } from 'zod';
import { JOBPOST } from '@/lib/config';
import { AppError } from '@/lib/errors';
export const PinnedAddressSchema = z
  .object({ address: z.string(), family: z.union([z.literal(4), z.literal(6)]) })
  .strict();
export type PinnedAddress = z.infer<typeof PinnedAddressSchema>;
export type Resolver = (hostname: string) => Promise<unknown>;
export const resolveHost: Resolver = (hostname) =>
  lookup(hostname, { all: true, order: 'verbatim' });
/** Fail closed for non-global, transition and documentation ranges. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
    return (
      a > 0 &&
      a < 224 &&
      a !== 10 &&
      a !== 127 &&
      !(a === 100 && b >= 64 && b <= 127) &&
      !(a === 169 && b === 254) &&
      !(a === 172 && b >= 16 && b <= 31) &&
      !(a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) &&
      !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) &&
      !(a === 203 && b === 0 && c === 113)
    );
  }
  if (family === 6) {
    const [first = 0, second = 0] = address
      .toLowerCase()
      .split(':')
      .map((part) => Number.parseInt(part || '0', 16));
    return (
      first >= 0x2000 &&
      first < 0x4000 &&
      first !== 0x2002 &&
      first !== 0x3fff &&
      !(first === 0x2001 && (second <= 0x01ff || second === 0x0db8))
    );
  }
  return false;
}
export function jobUrl(source: string): URL {
  const value = z.string().min(1).max(JOBPOST.MAX_CHARS).parse(source);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new AppError('JOBPOST_FETCH_FAILED');
  url.hash = '';
  return url;
}
export async function resolvePublicAddress(
  url: URL,
  resolve: Resolver = resolveHost,
): Promise<PinnedAddress> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.localhost'))
    throw new AppError('JOBPOST_FETCH_FAILED');
  const family = isIP(hostname);
  const addresses = z
    .array(PinnedAddressSchema)
    .min(1)
    .parse(family ? [{ address: hostname, family }] : await resolve(hostname));
  if (
    addresses.some((item) => isIP(item.address) !== item.family || !isPublicAddress(item.address))
  )
    throw new AppError('JOBPOST_FETCH_FAILED');
  const first = addresses[0];
  if (!first) throw new AppError('JOBPOST_FETCH_FAILED');
  return first;
}
