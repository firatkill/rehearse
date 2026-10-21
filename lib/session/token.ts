import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ROLES, SENIORITIES, SESSION, TOKEN } from '@/lib/config';

export const TokenPayloadSchema = z
  .object({
    v: z.literal(1),
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Byte-exact normative schema in TRD 13.1.
    sid: z.string().uuid(),
    iat: z.number().int(),
    exp: z.number().int(),
    fb: z.number().int().min(1).max(7),
    sm: z.number().int().min(0).max(2),
    q: z.array(z.string()).min(3).max(5),
    r: z.enum(ROLES),
    s: z.enum(SENIORITIES),
    b: z.string(),
  })
  .strict();
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
export type VerifyResult =
  { ok: true; payload: TokenPayload } | { ok: false; code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' };

export function signToken(p: TokenPayload, secret: string): string {
  const body = `${TOKEN.PREFIX}.${Buffer.from(JSON.stringify(p)).toString('base64url')}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function verifyToken(token: string, secrets: readonly string[], nowS: number): VerifyResult {
  const invalid = { ok: false, code: 'TOKEN_INVALID' } as const;
  if (token.length > 2000) return invalid;
  const parts = token.split('.');
  const [prefix, payload, signature] = parts;
  if (
    parts.length !== 3 ||
    prefix !== TOKEN.PREFIX ||
    payload === undefined ||
    signature === undefined
  )
    return invalid;
  const received = Buffer.from(signature, 'base64url');
  const matched = secrets.some((secret) => {
    const expected = createHmac('sha256', secret).update(`${prefix}.${payload}`).digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
  if (!matched) return invalid;
  try {
    const parsed = TokenPayloadSchema.parse(
      JSON.parse(Buffer.from(payload, 'base64url').toString()),
    );
    if (parsed.exp <= nowS) return { ok: false, code: 'TOKEN_EXPIRED' };
    if (parsed.iat > nowS + 60 || parsed.exp - parsed.iat > SESSION.TOKEN_TTL_S) return invalid;
    return { ok: true, payload: parsed };
  } catch {
    return invalid;
  }
}
