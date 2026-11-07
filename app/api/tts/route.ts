import { randomUUID } from 'node:crypto';
import { TTS } from '@/lib/config';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { TtsRequestSchema } from '@/lib/api/tts-contract';
import { readJsonBody, checkOrigin, jsonError } from '@/lib/request';
import { verifyToken } from '@/lib/session/token';
import { verifyFollowUp } from '@/lib/session/follow-up';
import { getInterviewQuestion } from '@/lib/demo/catalog';
import { generateSpeech } from '@/lib/tts/provider';
import { recordCost } from '@/lib/cost/budget';
import { getLogger } from '@/lib/logger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID(),
    started = Date.now();
  let chars = 0;
  try {
    const env = getEnv();
    if (env.APP_EDITION !== 'full' || env.TTS_PROVIDER === 'browser')
      throw new AppError('DEMO_ONLY');
    checkOrigin(request, env);
    const parsed = TtsRequestSchema.safeParse(await readJsonBody(request, TTS.REQUEST_MAX_BYTES));
    if (!parsed.success) throw new AppError('VALIDATION_FAILED');
    const input = parsed.data;
    let text: string = input.language === 'tr' ? TTS.PREVIEW_TEXT_TR : TTS.PREVIEW_TEXT;
    if (input.kind === 'question') {
      const bearer = request.headers.get('x-rehearse-session');
      if (!bearer) throw new AppError('TOKEN_MISSING');
      const secrets = [
        env.SESSION_SECRET,
        ...(env.SESSION_SECRET_PREVIOUS ? [env.SESSION_SECRET_PREVIOUS] : []),
      ];
      const now = Math.floor(Date.now() / 1000);
      const proof = verifyToken(bearer, secrets, now);
      if (!proof.ok) throw new AppError(proof.code);
      if (
        proof.payload.q[input.index] !== input.questionId ||
        (proof.payload.l ?? 'en') !== input.language
      )
        throw new AppError('TOKEN_SCOPE');
      const question = getInterviewQuestion(input.questionId, input.language);
      if (!question) throw new AppError('TOKEN_SCOPE');
      text = question.prompt;
      if (input.followUpToken) {
        const followUp = verifyFollowUp(
          input.followUpToken,
          secrets,
          proof.payload,
          input.index,
          now,
        );
        if (!followUp.ok) throw new AppError(followUp.code);
        text = followUp.prompt;
      }
    }
    chars = Array.from(text).length;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(TTS.PROVIDER_TIMEOUT_MS)]);
    const result = await generateSpeech(text, input.language, signal);
    recordCost(requestId, result.costUsd);
    getLogger().info({
      event: 'tts.generated',
      requestId,
      chars,
      latencyMs: Date.now() - started,
      costUsd: result.costUsd,
    });
    return new Response(result.audio, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const code = error instanceof AppError ? error.code : 'PROVIDER_ERROR';
    getLogger().info({
      event: 'tts.failed',
      requestId,
      chars,
      latencyMs: Date.now() - started,
      code,
    });
    return jsonError(code, requestId);
  }
}
