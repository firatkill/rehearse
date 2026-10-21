import 'server-only';
import { createHash, createHmac } from 'node:crypto';
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function hmacSha256Hex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}
export function base64url(value: string | Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}
