import 'server-only';
import { hmacSha256Hex } from '@/lib/hash';
import { utcDate } from '@/lib/time';
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip')?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function visitorId(ip: string, secret: string, now: Date): string {
  const dailySalt = hmacSha256Hex(secret, utcDate(now)); // rotates at 00:00 UTC
  return hmacSha256Hex(dailySalt, ip).slice(0, 32);
}
