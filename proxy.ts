import { getEnv } from '@/lib/env';
import { validBasicAuth } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';

export function buildCsp(nonce: string, options: { dev: boolean; https: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
export function proxy(req: NextRequest) {
  const env = getEnv();
  if (
    env.APP_EDITION === 'full' &&
    env.APP_PASSWORD &&
    !validBasicAuth(req.headers.get('authorization'), env.APP_PASSWORD)
  ) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Rehearse", charset="UTF-8"',
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === 'development',
    https: req.nextUrl.protocol === 'https:',
  });
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(
    'x-rehearse-language',
    env.APP_EDITION === 'full' && req.nextUrl.searchParams.get('language') === 'tr' ? 'tr' : 'en',
  );
  requestHeaders.set('x-rehearse-path', req.nextUrl.pathname);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-request-id', crypto.randomUUID());
  requestHeaders.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('x-request-id', requestHeaders.get('x-request-id') ?? '');
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set(
    'Permissions-Policy',
    'microphone=(self), camera=(), geolocation=(), payment=(), usb=()',
  );
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV !== 'development')
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  return res;
}
export const config = { matcher: ['/:path*'] };
