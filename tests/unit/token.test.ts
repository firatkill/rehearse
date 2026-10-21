import { createHmac } from 'node:crypto';
import { expect, it } from 'vitest';
import { signToken, verifyToken, type TokenPayload } from '@/lib/session/token';

const now = 1_700_000_000;
const secret = 'a'.repeat(64);
const previous = 'b'.repeat(64);
const payload: TokenPayload = {
  v: 1,
  sid: 'b1557bb8-eaa6-4d58-8d4c-7128c3a1454c',
  iat: now,
  exp: now + 7200,
  fb: 5,
  sm: 2,
  q: ['beh-001', 'tec-001', 'sdl-001'],
  r: 'frontend',
  s: 'mid',
  b: '1.0.0',
};
const invalid = { ok: false, code: 'TOKEN_INVALID' };
function signedRaw(raw: string): string {
  const body = `rh1.${Buffer.from(raw).toString('base64url')}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

it('TC-026 UT-08 round trips scoped payloads and accepts the previous secret during rotation', () => {
  const token = signToken(payload, secret);
  expect(token).toBe(signedRaw(JSON.stringify(payload)));
  expect(verifyToken(token, [secret], now)).toEqual({ ok: true, payload });
  expect(verifyToken(signToken(payload, previous), [secret, previous], now)).toEqual({
    ok: true,
    payload,
  });
  expect(verifyToken(token, [previous], now)).toEqual(invalid);
  expect(verifyToken(token, [], now)).toEqual(invalid);
  expect(verifyToken(signedRaw(JSON.stringify(payload, null, 2)), [secret], now)).toEqual({
    ok: true,
    payload,
  });
});

it('TC-026 UT-08 rejects tampering, unequal signatures, framing errors and oversized tokens', () => {
  const token = signToken(payload, secret);
  const [, body, signature] = token.split('.');
  for (const bad of [
    `rh1.${Buffer.from(JSON.stringify({ ...payload, fb: 7 })).toString('base64url')}.${signature}`,
    `rh1.${body}.${'A'.repeat(43)}`,
    `rh1.${body}.AA`,
    `rh1.${body}.`,
    token.replace('rh1.', 'rh2.'),
    `${token}.extra`,
    `rh1.${body}`,
    'x'.repeat(2001),
  ])
    expect(verifyToken(bad, [secret], now)).toEqual(invalid);
});

it('TC-026 UT-08 rejects correctly signed invalid JSON and invalid payload shapes', () => {
  for (const raw of [
    '{',
    JSON.stringify({ ...payload, fb: 8 }),
    JSON.stringify({ ...payload, q: [] }),
    JSON.stringify({ ...payload, extra: true }),
    JSON.stringify({ ...payload, sid: 'not-a-uuid' }),
    JSON.stringify({ ...payload, r: 'unknown' }),
    JSON.stringify({ ...payload, sm: 3 }),
  ])
    expect(verifyToken(signedRaw(raw), [secret], now)).toEqual(invalid);
});

it('TC-027 UT-08 enforces expiry, maximum lifetime and the 60-second clock-skew boundary', () => {
  const token = signToken(payload, secret);
  expect(verifyToken(token, [secret], now + 7199).ok).toBe(true);
  expect(verifyToken(token, [secret], now + 7200)).toEqual({ ok: false, code: 'TOKEN_EXPIRED' });
  expect(verifyToken(token, [secret], now + 7201)).toEqual({ ok: false, code: 'TOKEN_EXPIRED' });
  expect(verifyToken(signToken({ ...payload, iat: now + 60 }, secret), [secret], now).ok).toBe(
    true,
  );
  expect(verifyToken(signToken({ ...payload, iat: now + 61 }, secret), [secret], now)).toEqual(
    invalid,
  );
  expect(verifyToken(signToken({ ...payload, exp: now + 7201 }, secret), [secret], now)).toEqual(
    invalid,
  );
});
