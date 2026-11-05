import 'server-only';
import { timingSafeEqual } from 'node:crypto';
export function validBasicAuth(header: string | null, password: string): boolean {
  const encoded = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header ?? '')?.[1];
  if (!encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0 || decoded.slice(0, separator) !== 'rehearse') return false;
  const actual = Buffer.from(decoded.slice(separator + 1));
  const expected = Buffer.from(password);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
