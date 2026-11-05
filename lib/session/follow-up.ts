import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { FEEDBACK_LIMITS, FOLLOW_UP } from '@/lib/config';
import type { TokenPayload } from './token';
const PayloadSchema = z
  .object({
    v: z.literal(1),
    sid: z.uuid(),
    index: z.number().int().min(0).max(4),
    questionId: z.string().regex(/^(beh|tec|sdl)-\d{3}$/),
    prompt: z.string().min(1).max(FEEDBACK_LIMITS.FOLLOW_UP_MAX_CHARS),
    exp: z.number().int(),
  })
  .strict();
export function signFollowUp(
  session: TokenPayload,
  index: number,
  prompt: string,
  secret: string,
): string {
  const payload = PayloadSchema.parse({
    v: 1,
    sid: session.sid,
    index,
    questionId: session.q[index],
    prompt,
    exp: session.exp,
  });
  const body = `${FOLLOW_UP.TOKEN_PREFIX}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function verifyFollowUp(
  token: string,
  secrets: readonly string[],
  session: TokenPayload,
  index: number,
  nowS: number,
):
  | { ok: true; prompt: string }
  | { ok: false; code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_SCOPE' } {
  const invalid = { ok: false, code: 'TOKEN_INVALID' } as const;
  if (token.length > FOLLOW_UP.TOKEN_MAX_CHARS) return invalid;
  const [prefix, payload, signature, extra] = token.split('.');
  if (prefix !== FOLLOW_UP.TOKEN_PREFIX || !payload || !signature || extra !== undefined)
    return invalid;
  const received = Buffer.from(signature, 'base64url');
  if (
    !secrets.some((secret) => {
      const expected = createHmac('sha256', secret).update(`${prefix}.${payload}`).digest();
      return received.length === expected.length && timingSafeEqual(received, expected);
    })
  )
    return invalid;
  try {
    const data = PayloadSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
    if (data.exp <= nowS) return { ok: false, code: 'TOKEN_EXPIRED' };
    if (
      data.sid !== session.sid ||
      data.index !== index ||
      data.questionId !== session.q[index] ||
      data.exp !== session.exp
    )
      return { ok: false, code: 'TOKEN_SCOPE' };
    return { ok: true, prompt: data.prompt };
  } catch {
    return invalid;
  }
}
